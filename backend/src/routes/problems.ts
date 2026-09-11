import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import {
  requireAuth,
  requireRole,
  AuthedRequest,
} from "../middleware/auth";
import { isLanguage } from "../sandbox/languages";

export const problemsRouter = Router();

const createProblemSchema = z.object({
  roomId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  starterCode: z.string().default(""),
  language: z
    .enum(["C", "CPP", "JAVA", "PYTHON"])
    .default("C"),
});

// ---------------------------------------------------------
// FACULTY: Create a new practical/problem
// ---------------------------------------------------------
problemsRouter.post(
  "/",
  requireAuth,
  requireRole("FACULTY"),
  async (req: AuthedRequest, res) => {
    try {
      const parsed = createProblemSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.flatten(),
        });
      }

      const room = await prisma.room.findUnique({
        where: {
          id: parsed.data.roomId,
        },
      });

      if (!room || room.facultyId !== req.user!.id) {
        return res.status(403).json({
          error: "Not your room",
        });
      }

      const problem = await prisma.problem.create({
        data: parsed.data,
      });

      return res.status(201).json(problem);
    } catch (error) {
      console.error("Error creating problem:", error);

      return res.status(500).json({
        error: "Failed to create practical.",
      });
    }
  }
);

// ---------------------------------------------------------
// STUDENT / FACULTY:
// Get all practicals for a room
//
// Students also receive their last successfully saved
// practical record.
// ---------------------------------------------------------
problemsRouter.get(
  "/room/:roomId",
  requireAuth,
  async (req: AuthedRequest, res) => {
    try {
      const roomId = req.params.roomId;

      const room = await prisma.room.findUnique({
        where: {
          id: roomId,
        },
      });

      if (!room) {
        return res.status(404).json({
          error: "Room not found",
        });
      }

      // -----------------------------------------------------
      // Students can only view practicals from rooms they
      // have joined.
      // -----------------------------------------------------
      if (req.user!.role === "STUDENT") {
        const membership =
          await prisma.roomMember.findUnique({
            where: {
              roomId_userId: {
                roomId,
                userId: req.user!.id,
              },
            },
          });

        if (!membership) {
          return res.status(403).json({
            error: "You have not joined this room.",
          });
        }

        const problems =
          await prisma.problem.findMany({
            where: {
              roomId,
            },
            orderBy: {
              createdAt: "asc",
            },
            include: {
              practicalRecords: {
                where: {
                  studentId: req.user!.id,
                },
                select: {
                  id: true,
                  code: true,
                  output: true,
                  updatedAt: true,
                },
              },
            },
          });

        const result = problems.map((problem) => {
          const savedRecord =
            problem.practicalRecords.length > 0
              ? problem.practicalRecords[0]
              : null;

          return {
            id: problem.id,
            title: problem.title,
            description: problem.description,
            starterCode: problem.starterCode,
            language: problem.language,
            createdAt: problem.createdAt,
            savedRecord,
          };
        });

        return res.json(result);
      }

      // -----------------------------------------------------
      // Faculty:
      // Return normal problem information.
      // -----------------------------------------------------
      const problems =
        await prisma.problem.findMany({
          where: {
            roomId,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

      return res.json(problems);
    } catch (error) {
      console.error(
        "Error fetching room problems:",
        error
      );

      return res.status(500).json({
        error: "Failed to fetch practicals.",
      });
    }
  }
);

// ---------------------------------------------------------
// Get supported programming languages
// ---------------------------------------------------------
problemsRouter.get(
  "/languages",
  requireAuth,
  (_req, res) => {
    res.json(
      ["C", "CPP", "JAVA", "PYTHON"].filter(isLanguage)
    );
  }
);