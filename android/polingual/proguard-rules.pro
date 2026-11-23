-keepattributes *Annotation*, InnerClasses
-keep,includedescriptorclasses class foundation.bucket.**$$serializer { *; }
-keepclassmembers class foundation.bucket.** { *** Companion; }
-keep,includedescriptorclasses class com.polingual.**$$serializer { *; }
-dontwarn org.slf4j.**

-keep class * extends androidx.room.RoomDatabase { <init>(); }
-keep class androidx.work.impl.WorkDatabase_Impl { *; }
-keep class androidx.work.** { *; }
