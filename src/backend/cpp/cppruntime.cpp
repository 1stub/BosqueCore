#include <stdint.h>

typedef uint8_t charBuffImpl[8];

namespace PathStack {
    struct PathStack {
        uint64_t bits;
    };

    PathStack pop(PathStack ps) {
        return { .bits = ps.bits >> 1 };
    }

    PathStack push(PathStack ps) {
        return { .bits = ps.bits << 1 };
    }
}