import CryptoKit
import Foundation
let home = FileManager.default.homeDirectoryForCurrentUser
let cfg = try String(contentsOf: home.appending(path: ".appstoreconnect/config"), encoding: .utf8)
var kv: [String: String] = [:]
for line in cfg.split(separator: "\n") { let p = line.split(separator: "=", maxSplits: 1); if p.count == 2 { kv[String(p[0])] = String(p[1]) } }
let pem = try String(contentsOf: home.appending(path: ".appstoreconnect/private_keys/AuthKey_\(kv["KEY_ID"]!).p8"), encoding: .utf8)
let key = try P256.Signing.PrivateKey(pemRepresentation: pem)
func b64(_ d: Data) -> String { d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "") }
let now = Int(Date().timeIntervalSince1970)
let header = try JSONSerialization.data(withJSONObject: ["alg": "ES256", "kid": kv["KEY_ID"]!, "typ": "JWT"])
let claims = try JSONSerialization.data(withJSONObject: ["iss": kv["ISSUER"]!, "iat": now, "exp": now + 1100, "aud": "appstoreconnect-v1"])
let input = b64(header) + "." + b64(claims)
let sig = try key.signature(for: Data(input.utf8)).rawRepresentation
print(input + "." + b64(sig))
