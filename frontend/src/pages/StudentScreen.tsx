import { useEffect, useState } from "react";
import { authedFetch, AuthUser } from "../api";
import CodeWorkspace from "../components/CodeWorkspace";
import { Language, LANGUAGE_INFO } from "../languages";

interface SavedRecord {
  id: string;
  code: string;
  output: string;
  updatedAt: string;
}

interface Problem {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  language: Language;
  savedRecord?: SavedRecord | null;
}

interface Room {
  id: string;
  title: string;
  code: string;
  createdAt?: string;
  problemCount: number;
  completedCount: number;
}

export default function StudentScreen({
  user,
}: {
  user: AuthUser;
}) {
  const [joinCode, setJoinCode] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] =
    useState<Room | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selected, setSelected] =
    useState<Problem | null>(null);

  const [loadingRooms, setLoadingRooms] =
    useState(true);
  const [loadingProblems, setLoadingProblems] =
    useState(false);
  const [joining, setJoining] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // ---------------------------------------------------------
  // Load all rooms joined by the student
  // ---------------------------------------------------------
  async function loadRooms() {
    setError(null);
    setLoadingRooms(true);

    try {
      const result = await authedFetch(
        user.token,
        "/api/rooms/student"
      );

      if (result.error) {
        setError(result.error);
        setRooms([]);
        return;
      }

      setRooms(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load your rooms.");
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }

  // ---------------------------------------------------------
  // Load all practicals/problems for one room
  // ---------------------------------------------------------
  async function loadProblems(room: Room) {
    setError(null);
    setLoadingProblems(true);

    try {
      const result = await authedFetch(
        user.token,
        `/api/problems/room/${room.id}`
      );

      if (result.error) {
        setError(result.error);
        setProblems([]);
        return;
      }

      setProblems(
        Array.isArray(result)
          ? result
          : []
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load practicals.");
      setProblems([]);
    } finally {
      setLoadingProblems(false);
    }
  }

  // ---------------------------------------------------------
  // Load student's rooms after login / page refresh
  // ---------------------------------------------------------
  useEffect(() => {
    loadRooms();
  }, [user.token]);

  // ---------------------------------------------------------
  // Join a new room
  // ---------------------------------------------------------
  async function joinRoom() {
    const code = joinCode
      .trim()
      .toUpperCase();

    if (!code) {
      setError("Please enter a room code.");
      return;
    }

    setError(null);
    setJoining(true);

    try {
      const result = await authedFetch(
        user.token,
        `/api/rooms/join/${code}`,
        {
          method: "POST",
        }
      );

      if (result.error) {
        setError(result.error);
        return;
      }

      setJoinCode("");

      // Reload all rooms so the newly joined room
      // appears together with all previously joined rooms.
      await loadRooms();

      const joinedRoom: Room = {
        id: result.id,
        title: result.title,
        code: result.code,
        problemCount: 0,
        completedCount: 0,
      };

      setSelectedRoom(joinedRoom);
      await loadProblems(joinedRoom);
    } catch (err) {
      console.error(err);
      setError("Failed to join the room.");
    } finally {
      setJoining(false);
    }
  }

  // ---------------------------------------------------------
  // Open a room
  // ---------------------------------------------------------
  async function openRoom(room: Room) {
    setSelected(null);
    setSelectedRoom(room);
    await loadProblems(room);
  }

  // ---------------------------------------------------------
  // Back to all rooms
  // ---------------------------------------------------------
  function backToRooms() {
    setSelected(null);
    setSelectedRoom(null);
    setProblems([]);
    loadRooms();
  }

  // ---------------------------------------------------------
  // Open a practical
  //
  // If the student has successfully completed this practical
  // before, use their last successful code.
  //
  // Otherwise use faculty's starter code.
  // ---------------------------------------------------------
  function openProblem(problem: Problem) {
    setSelected(problem);
  }

  // ---------------------------------------------------------
  // Refresh data after closing workspace
  // ---------------------------------------------------------
  async function closeWorkspace() {
    setSelected(null);

    if (selectedRoom) {
      await loadProblems(selectedRoom);
      await loadRooms();
    }
  }

  // ---------------------------------------------------------
  // Download successfully saved code as TXT file
  // ---------------------------------------------------------
  function downloadRecord(problem: Problem) {
    const code = problem.savedRecord?.code;

    if (!code) {
      return;
    }

    const safeName = problem.title
      .replace(/[<>:"/\\|?*]+/g, "_")
      .trim();

    const fileName =
      `${safeName || "practical"}.txt`;

    const blob = new Blob([code], {
      type: "text/plain;charset=utf-8",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // ---------------------------------------------------------
  // CODE WORKSPACE
  // ---------------------------------------------------------
  if (selected) {
    return (
      <div className="page">
        <button
          className="btn-secondary"
          onClick={closeWorkspace}
          style={{
            marginBottom: 12,
          }}
        >
          ← Back to Practicals
        </button>

        <CodeWorkspace
          problemId={selected.id}
          starterCode={
            selected.savedRecord?.code ||
            selected.starterCode ||
            ""
          }
          language={selected.language}
          authToken={user.token}
          apiBase="http://localhost:4000"
        />
      </div>
    );
  }

  // ---------------------------------------------------------
  // ROOM PRACTICALS SCREEN
  // ---------------------------------------------------------
  if (selectedRoom) {
    const completedCount =
      problems.filter(
        (problem) =>
          !!problem.savedRecord
      ).length;

    return (
      <div className="page">
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <button
              className="btn-secondary"
              onClick={backToRooms}
              style={{
                marginBottom: 12,
              }}
            >
              ← All Rooms
            </button>

            <h1 style={{ margin: 0 }}>
              {selectedRoom.title}
            </h1>

            <div
              style={{
                marginTop: 6,
                color: "#64748b",
              }}
            >
              Room Code:{" "}
              <strong>
                {selectedRoom.code}
              </strong>
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "#f1f5f9",
              color: "#334155",
            }}
          >
            Completed:{" "}
            <strong>
              {completedCount} /{" "}
              {problems.length}
            </strong>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              marginBottom: 16,
              borderRadius: 8,
              background:
                "rgba(220, 38, 38, 0.12)",
              border:
                "1px solid rgba(220, 38, 38, 0.35)",
            }}
          >
            {error}
          </div>
        )}

        {loadingProblems ? (
          <div>
            Loading practicals...
          </div>
        ) : problems.length === 0 ? (
          <div
            className="card"
            style={{
              padding: 24,
              textAlign: "center",
            }}
          >
            <h3>
              No practicals yet
            </h3>

            <p
              style={{
                color: "#64748b",
              }}
            >
              Faculty has not added any
              practicals to this room yet.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {problems.map(
              (problem, index) => {
                const completed =
                  !!problem.savedRecord;

                return (
                  <div
                    key={problem.id}
                    className="card"
                    style={{
                      padding: 18,
                      border: completed
                        ? "1px solid rgba(34, 197, 94, 0.45)"
                        : "1px solid #e2e8f0",
                      background: completed
                        ? "rgba(34, 197, 94, 0.06)"
                        : "#ffffff",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        alignItems:
                          "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#64748b",
                            marginBottom: 5,
                          }}
                        >
                          Practical{" "}
                          {index + 1}
                        </div>

                        <h3
                          style={{
                            margin: 0,
                          }}
                        >
                          {problem.title}
                        </h3>
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          padding:
                            "5px 8px",
                          borderRadius: 999,
                          background:
                            completed
                              ? "rgba(34, 197, 94, 0.15)"
                              : "#f1f5f9",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {completed
                          ? "✓ Completed"
                          : "Not completed"}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 13,
                        color: "#64748b",
                      }}
                    >
                      Language:{" "}
                      <strong>
                        {
                          LANGUAGE_INFO[
                            problem.language
                          ]?.label ||
                          problem.language
                        }
                      </strong>
                    </div>

                    <p
                      style={{
                        marginTop: 12,
                        lineHeight: 1.5,
                        color: "#64748b",
                      }}
                    >
                      {problem.description}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        className="btn-primary"
                        onClick={() =>
                          openProblem(
                            problem
                          )
                        }
                      >
                        {completed
                          ? "Open Last Code"
                          : "Start Practical"}
                      </button>

                      {completed && (
                        <button
                          className="btn-secondary"
                          onClick={() =>
                            downloadRecord(
                              problem
                            )
                          }
                        >
                          Download{" "}
                          {problem.title}.txt
                        </button>
                      )}
                    </div>

                    {completed &&
                      problem.savedRecord
                        ?.updatedAt && (
                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 12,
                            color: "#64748b",
                          }}
                        >
                          Last saved:{" "}
                          {new Date(
                            problem
                              .savedRecord
                              .updatedAt
                          ).toLocaleString()}
                        </div>
                      )}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------
  // ALL ROOMS SCREEN
  // ---------------------------------------------------------
  return (
    <div
      className="page"
      style={{
        paddingBottom: 40,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            marginBottom: 6,
          }}
        >
          Student Dashboard
        </h2>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          Welcome, {user.name}. Select a
          room to view its practicals.
        </p>
      </div>

      {/* MAIN TWO COLUMN LAYOUT */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "280px minmax(0, 1fr)",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        {/* LEFT SIDE - MY ROOMS */}
        <div
          className="card"
          style={{
            padding: 18,
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 18,
                }}
              >
                My Rooms
              </h3>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                {rooms.length} room
                {rooms.length === 1
                  ? ""
                  : "s"}
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={loadRooms}
              disabled={loadingRooms}
              style={{
                padding:
                  "5px 9px",
                fontSize: 11,
              }}
            >
              {loadingRooms
                ? "..."
                : "Refresh"}
            </button>
          </div>

          {loadingRooms ? (
            <div
              style={{
                padding: 18,
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              Loading rooms...
            </div>
          ) : rooms.length === 0 ? (
            <div
              style={{
                padding: "18px 10px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              No rooms joined yet.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection:
                  "column",
                gap: 10,
              }}
            >
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() =>
                    openRoom(room)
                  }
                  style={{
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 12,
                    cursor:
                      "pointer",
                    background:
                      "#ffffff",
                    transition:
                      "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "flex-start",
                      gap: 8,
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 14,
                        color:
                          "#1e293b",
                        lineHeight:
                          1.3,
                      }}
                    >
                      {room.title}
                    </strong>

                    <span
                      style={{
                        fontSize: 11,
                        color:
                          "#64748b",
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      {room.completedCount}/
                      {room.problemCount}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 9,
                      display: "flex",
                      justifyContent:
                        "space-between",
                      alignItems:
                        "center",
                      gap: 8,
                    }}
                  >
                    <span className="join-code">
                      {room.code}
                    </span>

                    <span
                      style={{
                        fontSize: 12,
                        color:
                          "#64748b",
                      }}
                    >
                      {room.problemCount}{" "}
                      practical
                      {room.problemCount ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color:
                        "#64748b",
                    }}
                  >
                    Completed:{" "}
                    <strong>
                      {
                        room.completedCount
                      }
                    </strong>
                    {" / "}
                    {room.problemCount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER AREA */}
        <div>
          {/* JOIN ROOM */}
          <div
            className="card"
            style={{
              padding: 24,
              minHeight: 190,
              boxSizing:
                "border-box",
            }}
          >
            <div
              style={{
                marginBottom: 20,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                }}
              >
                Join New Room
              </h3>

              <p
                style={{
                  margin:
                    "6px 0 0",
                  color:
                    "#64748b",
                  fontSize: 14,
                }}
              >
                Enter the room code
                provided by your
                faculty.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                maxWidth: 700,
              }}
            >
              <input
                value={joinCode}
                onChange={(e) =>
                  setJoinCode(
                    e.target.value.toUpperCase()
                  )
                }
                onKeyDown={(e) => {
                  if (
                    e.key ===
                      "Enter" &&
                    !joining
                  ) {
                    joinRoom();
                  }
                }}
                placeholder="Enter room code"
                style={{
                  flex: 1,
                  minWidth: 220,
                }}
              />

              <button
                className="btn-primary"
                onClick={
                  joinRoom
                }
                disabled={
                  joining
                }
                style={{
                  padding:
                    "10px 20px",
                }}
              >
                {joining
                  ? "Joining..."
                  : "Join Room"}
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: 12,
                  marginTop: 18,
                  borderRadius: 8,
                  background:
                    "rgba(220, 38, 38, 0.12)",
                  border:
                    "1px solid rgba(220, 38, 38, 0.35)",
                  color:
                    "#b91c1c",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}
          </div>

          {/* INFORMATION CARD */}
          <div
            className="card"
            style={{
              marginTop: 24,
              padding: 24,
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 18,
              }}
            >
              Your Practical Rooms
            </h3>

            <p
              style={{
                margin: 0,
                color:
                  "#64748b",
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              Select any room from
              the left side to view
              all practicals added
              by your faculty. Your
              successfully completed
              practicals will be marked
              as completed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}