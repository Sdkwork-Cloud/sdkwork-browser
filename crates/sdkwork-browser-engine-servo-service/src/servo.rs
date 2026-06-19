#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ServoEnginePhase {
    NotAvailable,
    Stub,
}

pub fn servo_engine_phase() -> ServoEnginePhase {
    ServoEnginePhase::NotAvailable
}
