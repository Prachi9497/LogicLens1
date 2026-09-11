import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface RunDoneResult {
  exitCode: number | null;
  timedOut: boolean;
  crashed: boolean;
  stdout: string;
  stderr: string;
}

export default function InteractiveConsole({
  sessionId,
  authToken,
  apiBase,
  onDone,
}: {
  sessionId: string;
  authToken: string;
  apiBase: string;
  onDone: (result: RunDoneResult) => void;
}) {
  const [output, setOutput] = useState("");
  const [inputLine, setInputLine] = useState("");
  const [running, setRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const socket = io(apiBase, {
      auth: { token: authToken },
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("run:start", { sessionId });
    });

    socket.on("run:stdout", (data: string) => {
      setOutput((prev) => prev + data);
    });

    socket.on("run:stderr", (data: string) => {
      setOutput((prev) => prev + data);
    });

    socket.on("run:done", (result: RunDoneResult) => {
      setRunning(false);

      // The program finished normally or with a runtime failure.
      // Pass the complete result back to CodeWorkspace.
      onDoneRef.current(result);
    });

    socket.on(
      "run:error",
      ({ message }: { message: string }) => {
        setError(message);
        setRunning(false);

        // Tell CodeWorkspace that the interactive run failed.
        // This prevents the UI from treating a connection/session
        // error as a successful practical.
        onDoneRef.current({
          exitCode: null,
          timedOut: false,
          crashed: true,
          stdout: "",
          stderr: message,
        });
      }
    );

    socket.on("connect_error", () => {
      const message = "Could not connect to the run server";

      setError(message);
      setRunning(false);

      // Report connection failure to CodeWorkspace.
      onDoneRef.current({
        exitCode: null,
        timedOut: false,
        crashed: true,
        stdout: "",
        stderr: message,
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, authToken, apiBase]);

  useEffect(() => {
    bodyRef.current?.scrollTo(
      0,
      bodyRef.current.scrollHeight
    );
  }, [output, inputLine]);

  useEffect(() => {
    if (running) {
      inputRef.current?.focus();
    }
  }, [running, output]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!running || !socketRef.current) {
      return;
    }

    const line = inputLine;

    socketRef.current.emit("run:stdin", {
      sessionId,
      data: line + "\n",
    });

    setOutput((prev) => prev + line + "\n");
    setInputLine("");
  }

  return (
    <div className="interactive-terminal">
      <div className="interactive-terminal-header">
        <span>Output</span>

        {running ? (
          <span className="terminal-status running">
            Running
          </span>
        ) : error ? (
          <span className="terminal-status error">
            Error
          </span>
        ) : (
          <span className="terminal-status done">
            Finished
          </span>
        )}
      </div>

      <div
        ref={bodyRef}
        className="interactive-terminal-body"
      >
        <div className="interactive-terminal-output">
          <span>{output}</span>

          {running && (
            <form
              className="interactive-terminal-input-row"
              onSubmit={handleSubmit}
            >
              <input
                ref={inputRef}
                className="interactive-terminal-input"
                value={inputLine}
                onChange={(e) =>
                  setInputLine(e.target.value)
                }
                disabled={!running}
                autoComplete="off"
                spellCheck={false}
                aria-label="Program input"
              />
            </form>
          )}
        </div>
      </div>

      {error && (
        <div className="interactive-terminal-error">
          {error}
        </div>
      )}

      {!running && !error && (
        <div className="interactive-terminal-footer">
          Program finished. Click Run again to restart.
        </div>
      )}
    </div>
  );
}