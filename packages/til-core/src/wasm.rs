#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn parse_task(input: &str) -> JsValue {
    let result = crate::nlp::task::parse(input);
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn parse_event(input: &str) -> JsValue {
    let result = crate::nlp::calendar::parse(input);
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}
