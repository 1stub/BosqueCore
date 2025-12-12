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

    std::cerr << "Begin init gc\n";

    gtl_info.initializeGC<sizeof(allocs) / sizeof(allocs[0])>(allocs);

    std::cerr << "GC init done\nBegin init decs object\n";

    g_decs_prcsr.initialize();

    std::cerr << "Decs init done\nRun main\n";

    // Calling our emitted main is hardcoded for now
    __CoreCpp::MainType ret = Main::main();
    std::cout << __CoreCpp::to_string(ret) << std::endl;

    std::cerr << "Main finished\n";

    // Ensure decs thread stops waiting
    g_decs_prcsr.signalFinished();

    std::cerr << "Decs thread completed\n\n";

    return 0;
}

int main() {

    std::cerr << "Initializing locks\n";

    INIT_LOCKS();   

    std::cerr << "Locks initialized\n";

    InitBSQMemoryTheadLocalInfo();

    std::cerr << "BSQTheadLocalInfo init\n";

    return wrap_setjmp();
}
