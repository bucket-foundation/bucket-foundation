package foundation.bucket.core.model

sealed class BucketError(override val message: String) : Exception(message) {
    data object BadEmail : BucketError("Enter a valid email address.")
    data object BadCode : BucketError("That code did not work. Check the newest email and try again.")
    data class RateLimited(val text: String?) : BucketError(text ?: "Too many tries. Wait ten minutes and try again.")
    data object Revoked : BucketError("Your session ended. Sign in again.")
    data object Unavailable : BucketError("Sign-in is unavailable right now.")
    data class Server(val status: Int, val text: String?) : BucketError(text ?: "Bucket answered $status.")
    data object Decoding : BucketError("Bucket sent a reply this version cannot read.")
    data object NotFound : BucketError("That room or invite no longer works.")
    data object RoomFull : BucketError("This room is full.")
    data object NameNotAllowed : BucketError("That name is not allowed. Try another.")
    data object TextNotAllowed : BucketError("That text is not allowed. Try other words.")
    data object Offline : BucketError("No connection. Check your network and try again.")
    data object SyncPending : BucketError("Your language sets did not reach the server. Connect and try again, or your changes on this device will be lost.")
}
