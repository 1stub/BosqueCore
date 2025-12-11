#include "emit.hpp"

//CODE

// Prevents longjmp clobbering rbp in the gc
int wrap_setjmp() {
    if(setjmp(__CoreCpp::info.error_handler)) { 
        // We may want to pass in some source info here and perhaps expression causing failure
        std::cout << "Assertion failed! Or perhaps over/underflow?" << std::endl;
        g_decs_prcsr.signalFinished();
        return EXIT_FAILURE;
    }

    gtl_info.initializeGC<sizeof(allocs) / sizeof(allocs[0])>(allocs);

    std::cerr << "GC Initialized\n";

    // Calling our emitted main is hardcoded for now
    __CoreCpp::MainType ret = Main::main();
    std::cout << __CoreCpp::to_string(ret) << std::endl;

    std::cerr << "Main executed and returned\n";

    // Ensure decs thread stops waiting
    g_decs_prcsr.signalFinished();

    std::cerr << "Program complete\nLive thread count " << GlobalThreadAllocInfo::s_thread_counter << std::endl;

    return 0;
}

int main() {
    std::cerr << "Test starting\n";

    INIT_LOCKS();   

    std::cerr << "Locks Initialized\n";

    InitBSQMemoryTheadLocalInfo();

    std::cerr << "Thread local storages initialized\n";

    return wrap_setjmp();
}
