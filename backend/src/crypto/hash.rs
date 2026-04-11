pub struct Checksum {
    hasher: Sha256,
    salt: Option<Vec<u8>>,
}