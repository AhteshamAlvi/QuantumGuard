# Data models for a session: roles, connection state, and mode (classical/quantum).
#
# TODO [WIRING]: Define models used by services/session_manager.py:
#
#   class Session:
#       session_id: str
#       devices: dict[Role, WebSocket]    # role → active WS connection
#       mode: "classical" | "quantum" | None
#       phase: "lobby"|"key_exchange"|"transferring"|"complete"|"aborted"
#       intruder_settings: IntruderSettings
#       shared_key: str | None            # the key exchanged between Origin/Target
#       metrics: Metrics                  # running metrics state
#
#   Role = Literal["origin", "target", "intruder"]
