use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub enum Message {
    KeyExchange,
    KeyResponse { key: String, valid: bool },
    FileChunk { data: Vec<u8> },
    TransferStatus { success: bool },
}
