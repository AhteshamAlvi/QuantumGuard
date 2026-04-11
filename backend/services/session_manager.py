# Manages active sessions, tracks connected devices, and assigns roles.
#
# TODO [WIRING]: Implement an in-memory session store.
#
# Required interface (called by routes/session.py and routes/ws.py):
#
#   create_session() → str                    # returns a new 6-char session ID
#   get_session(session_id) → Session | None
#   add_device(session_id, role, websocket)   # registers a WS connection for a role
#   remove_device(session_id, role)           # on WS disconnect
#   get_connections(session_id) → dict        # role → WebSocket mapping
#   broadcast(session_id, message)            # send to all connected devices
#   send_to(session_id, role, message)        # send to a specific role
#
# Sessions can be stored in a plain dict — no database needed for the hackathon.
# Consider cleanup: remove sessions with no connections after a timeout.
