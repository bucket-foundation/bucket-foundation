package foundation.bucket.core.model

import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

open class LenientEnumSerializer<E : Enum<E>>(name: String, private val entries: List<E>, private val wire: (E) -> String, private val fallback: E) : KSerializer<E> {
    override val descriptor: SerialDescriptor = PrimitiveSerialDescriptor("foundation.bucket.$name", PrimitiveKind.STRING)
    override fun serialize(encoder: Encoder, value: E) = encoder.encodeString(wire(value))
    override fun deserialize(decoder: Decoder): E {
        val text = decoder.decodeString()
        return entries.firstOrNull { wire(it) == text } ?: fallback
    }
}
