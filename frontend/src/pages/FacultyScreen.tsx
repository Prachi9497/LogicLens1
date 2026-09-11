import { useEffect, useState } from "react";
import { authedFetch, AuthUser } from "../api";
import {
  Language,
  STARTER_TEMPLATES,
  LANGUAGE_INFO,
} from "../languages";

interface Problem {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  language: Language;
}

interface Room {
  id: string;
  title: string;
  code: string;
  problems: Problem[];
}

export default function FacultyScreen({
  user,
}: {
  user: AuthUser;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    null
  );

  const [showNewRoom, setShowNewRoom] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");

  const [showNewProblem, setShowNewProblem] = useState(false);
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDesc, setProblemDesc] = useState("");
  const [problemLanguage, setProblemLanguage] =
    useState<Language>("C");
  const [starterCode, setStarterCode] = useState(
    STARTER_TEMPLATES.C
  );

  const [progress, setProgress] = useState<any>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    const data = await authedFetch(
      user.token,
      "/api/rooms/mine"
    );

    if (Array.isArray(data)) {
      setRooms(data);

      if (data.length > 0 && !selectedRoomId) {
        setSelectedRoomId(data[0].id);
      }
    }
  }

  async function createRoom() {
    if (!roomTitle.trim()) return;

    await authedFetch(user.token, "/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        title: roomTitle,
      }),
    });

    setRoomTitle("");
    setShowNewRoom(false);

    await loadRooms();
  }

  async function createProblem() {
    if (!selectedRoomId || !problemTitle.trim()) return;

    await authedFetch(user.token, "/api/problems", {
      method: "POST",
      body: JSON.stringify({
        roomId: selectedRoomId,
        title: problemTitle,
        description: problemDesc,
        starterCode,
        language: problemLanguage,
      }),
    });

    setProblemTitle("");
    setProblemDesc("");
    setProblemLanguage("C");
    setStarterCode(STARTER_TEMPLATES.C);
    setShowNewProblem(false);

    await loadRooms();
  }

  function handleLanguageChange(lang: Language) {
    setProblemLanguage(lang);
    setStarterCode(STARTER_TEMPLATES[lang]);
  }

  async function loadProgress() {
    if (!selectedRoomId) return;

    setLoadingProgress(true);

    const data = await authedFetch(
      user.token,
      `/api/rooms/${selectedRoomId}/progress`
    );

    setProgress(data);
    setLoadingProgress(false);
  }

  async function deleteRoom(
    roomId: string,
    roomTitle: string
  ) {
    if (
      !confirm(
        `Delete "${roomTitle}"? This removes all its problems and student progress permanently.`
      )
    ) {
      return;
    }

    await authedFetch(
      user.token,
      `/api/rooms/${roomId}`,
      {
        method: "DELETE",
      }
    );

    if (selectedRoomId === roomId) {
      setSelectedRoomId(null);
      setProgress(null);
    }

    await loadRooms();
  }

  useEffect(() => {
    if (selectedRoomId) {
      loadProgress();
    }
  }, [selectedRoomId]);

  const selectedRoom = rooms.find(
    (r) => r.id === selectedRoomId
  );

  return (
    <div
      className="page"
      style={{
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <h2 style={{ marginBottom: 6 }}>
          Faculty Dashboard
        </h2>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          Manage your rooms, practicals and student progress.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px minmax(0, 1fr)",
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
              justifyContent: "space-between",
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
                {rooms.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {rooms.length === 0 && (
            <div
              style={{
                padding: "18px 10px",
                textAlign: "center",
                color: "#94a3b8",
                fontSize: 13,
              }}
            >
              No rooms created yet.
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {rooms.map((r) => {
              const selected =
                r.id === selectedRoomId;

              return (
                <div
                  key={r.id}
                  onClick={() =>
                    setSelectedRoomId(r.id)
                  }
                  style={{
                    border: selected
                      ? "2px solid #2563eb"
                      : "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 12,
                    cursor: "pointer",
                    background: selected
                      ? "#eff6ff"
                      : "#ffffff",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 14,
                        color: "#1e293b",
                        lineHeight: 1.3,
                      }}
                    >
                      {r.title}
                    </strong>

                    <button
                      className="btn-secondary"
                      style={{
                        color: "#b91c1c",
                        padding: "3px 7px",
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();

                        deleteRoom(
                          r.id,
                          r.title
                        );
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop: 9,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span className="join-code">
                      {r.code}
                    </span>

                    <span
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                      }}
                    >
                      {r.problems.length} problem
                      {r.problems.length === 1
                        ? ""
                        : "s"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER AREA */}
        <div>
          {/* CREATE ROOM */}
          <div
            className="card"
            style={{
              padding: 24,
              minHeight: 190,
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
                Create New Room
              </h3>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontSize: 14,
                }}
              >
                Create a room for your students to join
                and complete practicals.
              </p>
            </div>

            {!showNewRoom ? (
              <button
                className="btn-primary"
                onClick={() =>
                  setShowNewRoom(true)
                }
                style={{
                  padding: "10px 20px",
                }}
              >
                + Create Room
              </button>
            ) : (
              <div
                style={{
                  maxWidth: 600,
                }}
              >
                <input
                  placeholder="Room title, e.g. CS101 Section A"
                  value={roomTitle}
                  onChange={(e) =>
                    setRoomTitle(e.target.value)
                  }
                />

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <button
                    className="btn-primary"
                    onClick={createRoom}
                  >
                    Create Room
                  </button>

                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setShowNewRoom(false);
                      setRoomTitle("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SELECTED ROOM */}
          {selectedRoom && (
            <div
              className="card"
              style={{
                marginTop: 24,
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 15,
                  marginBottom: 18,
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                    }}
                  >
                    {selectedRoom.title}
                  </h3>

                  <div
                    style={{
                      marginTop: 5,
                      color: "#64748b",
                      fontSize: 13,
                    }}
                  >
                    Room Code:{" "}
                    <span className="join-code">
                      {selectedRoom.code}
                    </span>
                  </div>
                </div>

                <button
                  className="btn-secondary"
                  onClick={() =>
                    setShowNewProblem(true)
                  }
                >
                  + Add Practical
                </button>
              </div>

              {selectedRoom.problems.length === 0 ? (
                <div
                  style={{
                    padding: "22px 10px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: 14,
                    border: "1px dashed #cbd5e1",
                    borderRadius: 8,
                  }}
                >
                  No practicals added to this room yet.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {selectedRoom.problems.map(
                    (p) => (
                      <div
                        key={p.id}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 9,
                          padding: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <strong>
                            {p.title}
                          </strong>

                          <span className="chip">
                            {LANGUAGE_INFO[
                              p.language
                            ]?.label ??
                              p.language}
                          </span>
                        </div>

                        <p
                          style={{
                            fontSize: 13,
                            color: "#64748b",
                            marginBottom: 0,
                          }}
                        >
                          {p.description}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* CREATE PRACTICAL */}
              {showNewProblem && (
                <div
                  style={{
                    marginTop: 20,
                    padding: 18,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                  }}
                >
                  <h4
                    style={{
                      marginTop: 0,
                      marginBottom: 15,
                    }}
                  >
                    Create Practical
                  </h4>

                  <input
                    placeholder="Problem title"
                    value={problemTitle}
                    onChange={(e) =>
                      setProblemTitle(
                        e.target.value
                      )
                    }
                  />

                  <textarea
                    placeholder="Description"
                    value={problemDesc}
                    onChange={(e) =>
                      setProblemDesc(
                        e.target.value
                      )
                    }
                    style={{
                      height: 70,
                      marginTop: 10,
                    }}
                  />

                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#475569",
                      display: "block",
                      marginTop: 12,
                      marginBottom: 6,
                    }}
                  >
                    Language
                  </label>

                  <select
                    value={problemLanguage}
                    onChange={(e) =>
                      handleLanguageChange(
                        e.target.value as Language
                      )
                    }
                  >
                    {(
                      Object.keys(
                        LANGUAGE_INFO
                      ) as Language[]
                    ).map((lang) => (
                      <option
                        key={lang}
                        value={lang}
                      >
                        {
                          LANGUAGE_INFO[lang]
                            .label
                        }
                      </option>
                    ))}
                  </select>

                  <textarea
                    value={starterCode}
                    onChange={(e) =>
                      setStarterCode(
                        e.target.value
                      )
                    }
                    style={{
                      height: 120,
                      fontFamily: "monospace",
                      marginTop: 10,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      marginTop: 12,
                    }}
                  >
                    <button
                      className="btn-primary"
                      onClick={createProblem}
                    >
                      Create Practical
                    </button>

                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setShowNewProblem(false)
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* STUDENT PROGRESS */}
      {selectedRoom && (
        <div
          className="card"
          style={{
            marginTop: 24,
            padding: 24,
            overflowX: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 15,
              marginBottom: 18,
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 20,
                }}
              >
                Student Progress
              </h3>

              <p
                style={{
                  margin: "5px 0 0",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                Progress for{" "}
                <strong>
                  {selectedRoom.title}
                </strong>
              </p>
            </div>

            <button
              className="btn-secondary"
              onClick={loadProgress}
              disabled={loadingProgress}
            >
              {loadingProgress
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          <table
            style={{
              width: "100%",
              minWidth: 850,
            }}
          >
            <thead>
              <tr>
                <th>Student</th>
                <th>Practical</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Hints Used</th>
                <th>AI Patch</th>
                <th>Error Types</th>
              </tr>
            </thead>

            <tbody>
              {progress &&
                Object.values(progress).flatMap(
                  (
                    student: any,
                    si: number
                  ) =>
                    Object.values(
                      student.problems
                    ).map(
                      (
                        p: any,
                        pi: number
                      ) => (
                        <tr
                          key={`${si}-${pi}`}
                        >
                          <td>
                            {student.studentName}
                          </td>

                          <td>{p.title}</td>

                          <td>
                            <span
                              className={`badge ${
                                p.status ===
                                "SUCCESS"
                                  ? "badge-success"
                                  : p.status ===
                                    "ERROR"
                                  ? "badge-error"
                                  : "badge-running"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>

                          <td>
                            {p.totalAttempts}
                          </td>

                          <td>
                            {p.hintsUsed}
                          </td>

                          <td>
                            {p.usedAiPatch
                              ? "Yes"
                              : "No"}
                          </td>

                          <td>
                            {p.errorCategoriesEncountered.map(
                              (
                                c: string
                              ) => (
                                <span
                                  key={c}
                                  className="chip"
                                  style={{
                                    marginRight: 4,
                                  }}
                                >
                                  {c}
                                </span>
                              )
                            )}
                          </td>
                        </tr>
                      )
                    )
                )}

              {progress &&
                Object.keys(progress).length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        color: "#94a3b8",
                        textAlign: "center",
                        padding: 20,
                      }}
                    >
                      No submissions yet.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}