import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import {
  requireAuth,
  requireRole,
  AuthedRequest,
} from "../middleware/auth";

export const practicalRecordsRouter = Router();

const saveSchema = z.object({
  submissionId: z.string().uuid(),
  code: z.string().min(1).max(20000),
  output: z.string().max(20000).default(""),
});

practicalRecordsRouter.post(
  "/save",
  requireAuth,
  requireRole("STUDENT"),
  async (req: AuthedRequest, res) => {
    try {
      const parsed = saveSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: parsed.error.flatten(),
        });
      }

      const { submissionId, code, output } = parsed.data;

      const submission = await prisma.submission.findUnique({
        where: {
          id: submissionId,
        },
        include: {
          problem: {
            select: {
              id: true,
              roomId: true,
              title: true,
            },
          },
        },
      });

      if (!submission) {
        return res.status(404).json({
          error: "Submission not found",
        });
      }

      // Make sure the submission belongs to the logged-in student.
      if (submission.userId !== req.user!.id) {
        return res.status(403).json({
          error: "You cannot save another student's practical.",
        });
      }

      // Only successful submissions can be saved.
      if (submission.status !== "SUCCESS") {
        return res.status(400).json({
          error:
            "Only successfully executed practicals can be saved.",
        });
      }

      const record = await prisma.practicalRecord.upsert({
        where: {
          studentId_problemId: {
            studentId: req.user!.id,
            problemId: submission.problemId,
          },
        },

        create: {
          studentId: req.user!.id,
          problemId: submission.problemId,
          roomId: submission.problem.roomId,
          code,
          output,
        },

        update: {
          code,
          output,
        },
      });

      return res.json({
        success: true,
        record,
      });
    } catch (error) {
      console.error(
        "Error saving practical record:",
        error
      );

      return res.status(500).json({
        error: "Failed to save practical record.",
      });
    }
  }
);