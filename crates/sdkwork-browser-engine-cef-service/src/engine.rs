use sdkwork_browser_engine_api_service::BrowserEngineError;



#[cfg(feature = "cef")]

use crate::cef_native::{initialize_native_runtime, is_native_runtime_initialized, CefNativeError};



#[derive(Clone, Debug, Eq, PartialEq)]

pub struct CefEngineService {

    phase: CefEnginePhase,

    #[cfg(feature = "cef")]

    native_probe: Option<crate::cef_native::CefNativeProbe>,

}



#[derive(Clone, Copy, Debug, Eq, PartialEq)]

pub enum CefEnginePhase {

    Stub,

    NativeReady,

}



impl CefEngineService {

    pub fn bootstrap_stub() -> Self {

        Self {

            phase: CefEnginePhase::Stub,

            #[cfg(feature = "cef")]

            native_probe: None,

        }

    }



    pub fn initialize_runtime(&mut self) -> Result<(), BrowserEngineError> {

        #[cfg(feature = "cef")]

        {

            match initialize_native_runtime() {

                Ok(probe) => {

                    self.native_probe = Some(probe);

                    self.phase = CefEnginePhase::NativeReady;

                    Ok(())

                }

                Err(CefNativeError::SubprocessExit(code)) => {

                    Err(BrowserEngineError::Unsupported(format!(

                        "cef subprocess exit {code}"

                    )))

                }

                Err(CefNativeError::InitializeFailed(code)) => {

                    Err(BrowserEngineError::Unsupported(format!(

                        "cef_initialize failed ({code})"

                    )))

                }

                Err(CefNativeError::AlreadyInitialized) => {

                    self.phase = CefEnginePhase::NativeReady;

                    Ok(())

                }

            }

        }



        #[cfg(not(feature = "cef"))]

        {

            self.phase = CefEnginePhase::Stub;

            Ok(())

        }

    }



    pub fn phase(&self) -> CefEnginePhase {

        self.phase

    }



    pub fn engine_name(&self) -> &'static str {

        "cef"

    }



    pub fn binding_label(&self) -> &'static str {

        #[cfg(feature = "cef")]

        {

            if is_native_runtime_initialized() {

                return "cef-rs";

            }

        }

        match self.phase {

            CefEnginePhase::NativeReady => "cef-rs",

            CefEnginePhase::Stub => "cef-stub",

        }

    }



    #[cfg(feature = "cef")]

    pub fn native_probe(&self) -> Option<&crate::cef_native::CefNativeProbe> {

        self.native_probe.as_ref()

    }

}



#[cfg(test)]

mod tests {

    use super::*;



    #[test]

    fn cef_stub_becomes_ready() {

        let mut engine = CefEngineService::bootstrap_stub();

        engine.initialize_runtime().unwrap();

        assert_eq!(engine.phase(), CefEnginePhase::Stub);

        assert_eq!(engine.binding_label(), "cef-stub");

    }

}


