use sdkwork_utils_rust::{validated_offset_list_params, OffsetListPageParams, SdkWorkResultCode};
use serde::Deserialize;

#[derive(Clone, Debug, Default, Deserialize)]
pub struct BrowserListQuery {
    pub page: Option<i64>,
    #[serde(rename = "page_size")]
    pub page_size: Option<i64>,
    pub cursor: Option<String>,
    pub sort: Option<String>,
    pub q: Option<String>,
}

impl BrowserListQuery {
    pub fn offset_params(&self) -> Result<OffsetListPageParams, SdkWorkResultCode> {
        if self
            .cursor
            .as_deref()
            .is_some_and(|value| !value.trim().is_empty())
        {
            return Err(SdkWorkResultCode::InvalidParameter);
        }
        validated_offset_list_params(self.page, self.page_size)
    }
}
