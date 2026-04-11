# Pydantic schemas for all WebSocket message types exchanged between devices.
#
# TODO [WIRING]: Define Pydantic models that match frontend/src/types.ts.
#
# At minimum, define:
#
#   class WsMessage(BaseModel):
#       type: str          # one of WsMessageType values
#       payload: dict
#
#   class DeviceUpdate(BaseModel):
#       devices: list[DeviceInfo]
#
#   class PhaseUpdate(BaseModel):
#       phase: str         # "lobby"|"key_exchange"|"transferring"|"complete"|"aborted"
#
#   class MetricsUpdate(BaseModel):
#       qber: float | None
#       keyExchangeAttempts: int
#       keyEstablished: bool
#       intruderDetected: bool
#       intruderCapturedKey: bool
#       intruderCapturedFile: bool
#       fileHashMatch: bool | None
#       transferSuccess: bool | None
#
#   class IntruderSettingsMsg(BaseModel):
#       attackActive: bool
#       interceptionIntensity: float   # 0.0 to 1.0
