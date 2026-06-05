if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "/Users/mc/.gradle/caches/9.3.1/transforms/c543913378a67bf1b689182a89bc5a62/transformed/jetified-hermes-android-0.14.0-debug/prefab/modules/hermesvm/libs/android.x86_64/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/mc/.gradle/caches/9.3.1/transforms/c543913378a67bf1b689182a89bc5a62/transformed/jetified-hermes-android-0.14.0-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

