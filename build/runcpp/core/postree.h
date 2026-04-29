#pragma once

#include "../common.h"

#include "bsqtype.h"
#include "boxed.h"

#include "../runtime/allocator/alloc.h"

namespace ᐸRuntimeᐳ
{
    enum class RColor : uint64_t
    {
        Red,
        Black,
        BBlack,
        NBlack
    };

    //TODO: when this is hooked up to the GC we can drop this and use the page type info instead
    enum class PosRBTreeTag : uint64_t
    {
        Leaf,
        Node
    };

    struct PosRBTreeEmpty {
        RColor color = RColor::Black;

        static PosRBTreeEmpty mkBBlackEmpty() { return PosRBTreeEmpty{ RColor::BBlack }; }
    };

    template<typename T, int64_t K> class PosRBTreeNode;

    template<typename T, int64_t K> 
    class PosRBTreeLeaf
    {
    public:
        int64_t count;
        std::array<T, K> data;
        RColor color = RColor::Red;

        constexpr PosRBTreeLeaf() : count(0) { ; }
        constexpr PosRBTreeLeaf(const PosRBTreeLeaf& other) = default;

        //
        // im not 100% sure but we need to be pretty careful here with these 
        // two itr and init list constructors, if we create from another leaf
        // we lost its color!
        //

        template<typename Iter>
        requires std::random_access_iterator<Iter>
        PosRBTreeLeaf(Iter start, Iter end) 
        { 
            const int64_t size = std::distance(start, end);
            assert(size <= K);
            std::copy(start, end, this->data.begin());
            this->count = size; 
        }

        PosRBTreeLeaf(std::initializer_list<T> args)
        {
            assert(args.size() != 0);
            assert(args.size() <= K);

            std::copy(args.begin(), args.end(), this->data.begin());
            this->count = args.size();
        }

        T back() const
        {
            return this->data.back();
        }

        PosRBTreeLeaf subset(int64_t index, int64_t length) const
        {
            PosRBTreeLeaf nleaf = PosRBTreeLeaf(this->data.begin() + index, this->data.begin() + index + length);
            nleaf.color = this->color;

            return nleaf;
        }

        PosRBTreeLeaf subsetinsert(int64_t subset_index, int64_t insert_index, int64_t length, const T& value) const
        {
            assert(insert_index <= K);
            assert(subset_index + length <= K);
            assert(this->count <= K);
            assert(insert_index >= subset_index);

            PosRBTreeLeaf nleaf;
            insert_index -= subset_index;
            std::copy(this->data.begin() + subset_index, 
                      this->data.begin() + subset_index + insert_index, 
                      nleaf.data.begin());
            std::copy(this->data.begin() + subset_index + insert_index, 
                      this->data.begin() + subset_index + length, 
                      nleaf.data.begin() + insert_index + 1);
            
            nleaf.data[insert_index] = value;
            nleaf.count = length + 1;
            nleaf.color = this->color;

            return nleaf;
        }

        PosRBTreeLeaf insert(int64_t index, const T& value) const
        {
            assert(index < K);
            assert(this->count < K);
          
            PosRBTreeLeaf nleaf;
            if(index > 0) {
                std::copy(this->data.cbegin(), this->data.cbegin() + index, nleaf.data.begin());
            }

            if(index < this->count) {
                std::copy(this->data.cbegin() + index, this->data.cbegin() + this->count, nleaf.data.begin() + index + 1);               
            }

            nleaf.data[index] = value;
            nleaf.count = this->count + 1;
            nleaf.color = this->color;

            return nleaf;
        }

        PosRBTreeLeaf del(int64_t index) const 
        {
            assert(index < K);
            assert(this->count > 1);

            PosRBTreeLeaf nleaf;
            if(index > 0) {
                std::copy(this->data.cbegin(), this->data.cbegin() + index, nleaf.data.begin());
            }
            std::copy(this->data.cbegin() + index + 1, this->data.cbegin() + this->count, nleaf.data.begin() + index);

            nleaf.count = this->count - 1;
            nleaf.color = this->color;

            return nleaf;
        }
    };

    template<typename T, int64_t K>
    consteval TypeInfo g_typeinfo_PosRBTreeLeaf_generate(uint32_t tid, uint16_t tslots, const char* mask, const char* tname)
    {
        return TypeInfo{
            tid,
            sizeof(PosRBTreeLeaf<T, K>),
            byteSizeToSlotCount(sizeof(PosRBTreeLeaf<T, K>)),
            LayoutTag::ArrayRef,
            tslots,
            mask,
            nullptr,
            0,
            nullptr,
            0,
            nullptr,
            0,
            tname
        };
    }

    template<typename T, int64_t K>
    union PosRBTreeUnion
    {
        //empty tree is where boxed union typeinfo is nullptr
        PosRBTreeEmpty       empty;
        PosRBTreeLeaf<T, K>* leaf;
        PosRBTreeNode<T, K>* node;

        constexpr PosRBTreeUnion() : leaf() {}
        constexpr PosRBTreeUnion(const PosRBTreeUnion& other) = default;
        constexpr PosRBTreeUnion(PosRBTreeEmpty e)       : empty(e) {}
        constexpr PosRBTreeUnion(PosRBTreeLeaf<T, K>* l) : leaf(l) {}
        constexpr PosRBTreeUnion(PosRBTreeNode<T, K>* n) : node(n) {}
    };

    template<typename T, int64_t K>
    using PosRBTreeRepr = BoxedUnion<PosRBTreeUnion<T, K>>;

    template<typename T, int64_t K> 
    class PosRBTreeNode
    {
    public:
        int64_t count;
        RColor color;
        PosRBTreeRepr<T, K> left;
        PosRBTreeRepr<T, K> right;
    };

    template<typename T, int64_t K> 
    consteval TypeInfo g_typeinfo_PosRBTreeNode_generate(uint32_t tid, const char* tname)
    {
        return TypeInfo{
            tid,
            sizeof(PosRBTreeNode<T, K>),
            byteSizeToSlotCount(sizeof(PosRBTreeNode<T, K>)),
            LayoutTag::Ref,
            BSQ_TYPEINFO_NO_ESLOT,
            "002020",
            nullptr,
            0,
            nullptr,
            0,
            nullptr,
            0,
            tname
        };
    }

    ////
    //Note that we tag each template to keep the types distinct because we have the static allocator/type info! 
    //For now we probably want to mostly PIMPL the persistent tree logic and keep wrappers in the class to avoid code bloat but we can always change this later.
    ////
    template<typename T, int64_t K, uint32_t TreeID>
    class PosRBTree
    {
    public:
        PosRBTreeRepr<T, K> repr;

        static const TypeInfo* s_leaftypeinfo;
        thread_local static GCAllocator<PosRBTreeLeaf<T, K>>* s_leafallocator;

        static const TypeInfo* s_nodetypeinfo;
        thread_local static GCAllocator<PosRBTreeNode<T, K>>* s_nodeallocator;

        static PosRBTreeRepr<T, K> mkwleafRepr(PosRBTreeLeaf<T, K>* leaf) 
        {
            return PosRBTreeRepr<T, K>(s_leaftypeinfo, PosRBTreeUnion<T, K>(leaf));
        }

        static PosRBTreeRepr<T, K> mkwnodeRepr(PosRBTreeNode<T, K>* node) 
        {
            return PosRBTreeRepr<T, K>(s_nodetypeinfo, PosRBTreeUnion<T, K>(node));
        }

        static PosRBTreeRepr<T, K> mkwemptyRepr(PosRBTreeEmpty empty) 
        {
            return PosRBTreeRepr<T, K>(nullptr, PosRBTreeUnion<T, K>(empty));
        }

        static PosRBTree<T, K, TreeID> mkwleaf(PosRBTreeLeaf<T, K>* leaf) 
        {
            return PosRBTree<T, K, TreeID>(mkwleafRepr(leaf));
        }

        static PosRBTree<T, K, TreeID> mkwnode(PosRBTreeNode<T, K>* node) 
        {
            return PosRBTree<T, K, TreeID>(mkwnodeRepr(node));
        }

        static RColor blacken(RColor c) 
        {
            assert(c != RColor::BBlack);

            switch(c) {
                case RColor::Black:  return RColor::BBlack;
                case RColor::Red:    return RColor::Black;
                case RColor::NBlack:   return RColor::Red;
                default: assert(false && "how did i get here?");
            }
        }

        static RColor redden(RColor c) 
        {
            assert(c != RColor::NBlack);

            switch(c) {
                case RColor::BBlack: return RColor::Black;
                case RColor::Black:  return RColor::Red;
                case RColor::Red:    return RColor::NBlack;
                default: assert(false && "how did i get here?");
            }
        }

        static int64_t checkRBPathLengthInvariant(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo == nullptr) {
                assert(cur.data.empty.color == RColor::Black);

                return 0;
            }

            if(cur.typeinfo == s_leaftypeinfo) {
                const RColor cc = cur.data.leaf->color; 
                assert(cc == RColor::Red || cc == RColor::Black);

                return cc == RColor::Black ? 1 : 0;
            }
            
            const int lc = checkRBPathLengthInvariant(cur.data.node->left);
            if(lc == -1) {
                return -1;
            }

            const int rc = checkRBPathLengthInvariant(cur.data.node->right);
            if(rc == -1) {
                return -1;
            }

            if(lc != rc) { // black height mismatch
                return -1;
            }

            return cur.data.node->color == RColor::Black 
                ? lc + 1
                : lc;
        }

        static int64_t getReprCount(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo == nullptr) {
                return 0;
            }
            else if(cur.typeinfo == s_leaftypeinfo) {
                return cur.data.leaf->count;
            }
            else if(cur.typeinfo == s_nodetypeinfo) {
                return cur.data.node->count;
            }
            else {
                assert(false && "how did i get here?");
            }
        }

        static bool checkRBChildColorInvariant(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo != s_nodetypeinfo) {
                return true;
            }

            if(cur.data.node->color == RColor::Red) {
                const bool islred = getReprColor(cur.data.node->left) == RColor::Red;
                const bool isrred = getReprColor(cur.data.node->right) == RColor::Red;

                return !(islred || isrred);
            }

            return checkRBChildColorInvariant(cur.data.node->left)
                && checkRBChildColorInvariant(cur.data.node->right);
        }

        static bool checkRBInvariants(const PosRBTree<T, K, TreeID>& tree)
        {
            const bool a = checkRBChildColorInvariant(tree.repr);
            const bool b = checkRBPathLengthInvariant(tree.repr) >= 0;

            return a && b; 
        }

        static bool validateRedNode(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo != s_nodetypeinfo) {
                return false;
            }

            return cur.data.node->color == RColor::Red;
        }

        static bool validateRedNodeOrLeaf(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo == s_nodetypeinfo) {
                return cur.data.node->color == RColor::Red;
            }
            else if(cur.typeinfo == s_leaftypeinfo) {
                return cur.data.leaf->color == RColor::Red;
            }
            else {
                return false; 
            }
        }

        static bool validateBlackNode(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo != s_nodetypeinfo) {
                return false;
            }
            return cur.data.node->color == RColor::Black;
        }

        static bool validateBlackNodeOrLeaf(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo == s_nodetypeinfo) {
                return cur.data.node->color == RColor::Black;
            }
            else if(cur.typeinfo == s_leaftypeinfo) {
                return cur.data.leaf->color == RColor::Black;
            }
            else {
                return false; 
            }
        }

        static bool validateBBlackNode(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo != s_nodetypeinfo) {
                return false;
            }

            return cur.data.node->color == RColor::BBlack;
        }

        static bool validateBBlackOrBlackNode(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo != s_nodetypeinfo) {
                return false;
            }

            return cur.data.node->color == RColor::BBlack || cur.data.node->color == RColor::Black;
        }

        static bool validateNBlackNode(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo != s_nodetypeinfo) {
                return false;
            }

            return cur.data.node->color == RColor::NBlack;
        }

        static RColor getReprColor(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo == nullptr) {
                return cur.data.empty.color;
            }
            if(cur.typeinfo == s_leaftypeinfo) {
                return cur.data.leaf->color;
            }
            if(cur.typeinfo == s_nodetypeinfo) {
                return cur.data.node->color; 
            } 
            
            assert(false && "non empty/leaf/node typeinfo detected when reddening a tree repr!");
        }

        static PosRBTreeRepr<T, K> createRecoloredRepr(RColor nc, const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo == nullptr) {
                assert(nc == RColor::Black || nc == RColor::BBlack);
                return mkwemptyRepr(PosRBTreeEmpty{nc});
            }
            if(cur.typeinfo == s_leaftypeinfo) {
                cur.data.leaf->color = nc;
                return mkwleafRepr(s_leafallocator->allocate(*cur.data.leaf));
            }
            if(cur.typeinfo == s_nodetypeinfo) {
                cur.data.node->color = nc;
                return mkwnodeRepr(s_nodeallocator->allocate(*cur.data.node));
            }

            assert(false && "non empty/leaf/node typeinfo detected when recoloring a tree repr!");
        }

        static PosRBTreeRepr<T, K> reddenRepr(const PosRBTreeRepr<T, K>& cur)
        {
            if(cur.typeinfo == nullptr) {
                assert(cur.data.empty.color == RColor::BBlack);
                return mkwemptyRepr(PosRBTreeEmpty{RColor::Black});
            }
            if(cur.typeinfo == s_leaftypeinfo) {
                return createRecoloredRepr(redden(cur.data.leaf->color), cur);
            }
            if(cur.typeinfo == s_nodetypeinfo) {
                return createReprFromLR(redden(cur.data.node->color), cur.data.node->left, cur.data.node->right);
            }
            
            assert(false && "non empty/leaf/node typeinfo detected when reddening a tree repr!");
        }

        static PosRBTreeRepr<T, K> createReprFromLR(RColor c, const PosRBTreeRepr<T, K>& l, const PosRBTreeRepr<T, K>& r)
        {
/*
            if(l.typeinfo == nullptr) {
                return createRecoloredRepr(c, r);
            }
            if(r.typeinfo == nullptr) {
                return createRecoloredRepr(c, l);
            }
*/

            return mkwnodeRepr(s_nodeallocator->allocate(getReprCount(l) + getReprCount(r), c, l, r));
        }

        // double red violation on the LL side (tleft = Node{_, Red, Node{_, Red, a, b}, c})
        static std::optional<PosRBTreeRepr<T, K>> balancehelper_RR_LL(const PosRBTreeRepr<T, K>& cur)
        {
            if(!validateBBlackOrBlackNode(cur)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& l  = cur.data.node->left;
            if(!validateRedNode(l)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& ll = l.data.node->left;
            if(!validateRedNodeOrLeaf(ll)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K> nl = ll.typeinfo == s_nodetypeinfo
                ? createReprFromLR(RColor::Black, ll.data.node->left, ll.data.node->right)
                : createRecoloredRepr(RColor::Black, ll);
            const PosRBTreeRepr<T, K> nr = createReprFromLR(RColor::Black, l.data.node->right, cur.data.node->right);

            return createReprFromLR(redden(cur.data.node->color), nl, nr);
        }

        // double red violation on the LR side (tleft = Node{_, Red, a, Node{_, Red, b, c}})
        static std::optional<PosRBTreeRepr<T, K>> balancehelper_RR_LR(const PosRBTreeRepr<T, K>& cur)
        {
            if(!validateBBlackOrBlackNode(cur)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& l  = cur.data.node->left;
            if(!validateRedNode(l)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& lr = l.data.node->right;
            if(!validateRedNodeOrLeaf(lr)) {
                return std::nullopt;
            }

            // we might want to try splitting lr evenly between nl and nr if its a leaf
            PosRBTreeRepr<T, K> nl = lr.typeinfo == s_nodetypeinfo 
                    ? createReprFromLR(RColor::Black, l.data.node->left, lr.data.node->left)
                    : createReprFromLR(RColor::Black, l.data.node->left, lr);
            PosRBTreeRepr<T, K> nr = lr.typeinfo == s_nodetypeinfo
                    ? createReprFromLR(RColor::Black, lr.data.node->right, cur.data.node->right)
                    : createRecoloredRepr(RColor::Black, cur.data.node->right);

            return createReprFromLR(redden(cur.data.node->color), nl, nr);
        }

        // double red violation on the RL side (tright = Node{_, Red, Node{_, Red, b, c}, d})
        static std::optional<PosRBTreeRepr<T, K>> balancehelper_RR_RL(const PosRBTreeRepr<T, K>& cur)
        {
            if(!validateBBlackOrBlackNode(cur)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& r  = cur.data.node->right;
            if(!validateRedNode(r)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& rl = r.data.node->left;
            if(!validateRedNodeOrLeaf(rl)) {
                return std::nullopt;
            }

            // we might want to try splitting rl evenly between nl and nr if its a leaf
            PosRBTreeRepr<T, K> nl = rl.typeinfo == s_nodetypeinfo 
                    ? createReprFromLR(RColor::Black, cur.data.node->left, rl.data.node->left)
                    : createReprFromLR(RColor::Black, cur.data.node->left, rl);
            PosRBTreeRepr<T, K> nr = rl.typeinfo == s_nodetypeinfo
                    ? createReprFromLR(RColor::Black, rl.data.node->right, r.data.node->right)
                    : createRecoloredRepr(RColor::Black, r.data.node->right);

            return createReprFromLR(redden(cur.data.node->color), nl, nr);
        }

        // double red violation on the RR side (tright = Node{_, Red, b, Node{_, Red, c, d}})
        static std::optional<PosRBTreeRepr<T, K>> balancehelper_RR_RR(const PosRBTreeRepr<T, K>& cur)
        {
            if(!validateBBlackOrBlackNode(cur)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& r  = cur.data.node->right;
            if(!validateRedNode(r)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& rr = r.data.node->right;
            if(!validateRedNodeOrLeaf(rr)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K> nl = createReprFromLR(RColor::Black, cur.data.node->left, r.data.node->left);
            const PosRBTreeRepr<T, K> nr = rr.typeinfo == s_nodetypeinfo
                ? createReprFromLR(RColor::Black, rr.data.node->left, rr.data.node->right)
                : createRecoloredRepr(RColor::Black, rr);

            return createReprFromLR(redden(cur.data.node->color), nl, nr);
        }

        // negative blacks on L side (tleft = Node{_, NB, Node{_, Black, a, b}, Node{_, Black, c, d}})
        static std::optional<PosRBTreeRepr<T, K>> balancehelper_NB_L(const PosRBTreeRepr<T, K>& cur)
        {
            if(!validateBBlackNode(cur)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& l = cur.data.node->left;
            if(!validateNBlackNode(l)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& ll = l.data.node->left;
            if(!validateBlackNodeOrLeaf(ll)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& lr = l.data.node->right;
            if(!validateBlackNodeOrLeaf(lr)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K> nll = ll.typeinfo == s_nodetypeinfo
                ? balance(createReprFromLR(RColor::Red, ll.data.node->left, ll.data.node->right))
                : createRecoloredRepr(RColor::Red, ll);

            const PosRBTreeRepr<T, K> nl = lr.typeinfo == s_nodetypeinfo
                ? createReprFromLR(RColor::Black, nll, lr.data.node->left)
                : createReprFromLR(RColor::Black, nll, lr);
            const PosRBTreeRepr<T, K> nr = lr.typeinfo == s_nodetypeinfo
                ? createReprFromLR(RColor::Black, lr.data.node->right, cur.data.node->right)
                : createRecoloredRepr(RColor::Black, cur.data.node->right);

            return createReprFromLR(RColor::Black, nl, nr);
        }

        // negative blacks on R side (tright = Node{_, NB, Node{_, Black, b, c}, Node{_, Black, d, e}}})
        static std::optional<PosRBTreeRepr<T, K>> balancehelper_NB_R(const PosRBTreeRepr<T, K>& cur)
        {
            if(!validateBBlackNode(cur)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& r = cur.data.node->right;
            if(!validateNBlackNode(r)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& rl = r.data.node->left;
            if(!validateBlackNodeOrLeaf(rl)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K>& rr = r.data.node->right;
            if(!validateBlackNodeOrLeaf(rr)) {
                return std::nullopt;
            }

            const PosRBTreeRepr<T, K> nrr = rr.typeinfo == s_nodetypeinfo
                ? balance(createReprFromLR(RColor::Red, rr.data.node->left, rr.data.node->right))
                : createRecoloredRepr(RColor::Red, rr);

            const PosRBTreeRepr<T, K> nl = rl.typeinfo == s_nodetypeinfo
                ? createReprFromLR(RColor::Black, cur.data.node->left, rl.data.node->left)
                : createReprFromLR(RColor::Black, cur.data.node->left, rl);
            const PosRBTreeRepr<T, K> nr = rl.typeinfo == s_nodetypeinfo
                ? createReprFromLR(RColor::Black, rl.data.node->right, nrr)
                : createRecoloredRepr(RColor::Black, nrr);

            return createReprFromLR(RColor::Black, nl, nr);
        }

        static PosRBTreeRepr<T, K> balance(const PosRBTreeRepr<T, K>& cur)
        {
            if(auto res = balancehelper_RR_LL(cur)) {
                return *res;
            }
            else if(auto res = balancehelper_RR_LR(cur)) {
                return *res;
            }
            else if(auto res = balancehelper_RR_RL(cur)) {
                return *res;
            }
            else if(auto res = balancehelper_RR_RR(cur)) {
                return *res;
            }
            else if(auto res = balancehelper_NB_L(cur)) {
                return *res;
            }
            else if(auto res = balancehelper_NB_R(cur)) {
                return *res;
            }
            else {
                return cur;
            }
        }

        constexpr int64_t count() const
        {
            if(this->repr.typeinfo == nullptr) {
                return 0;
            }
            else {
                if(this->repr.typeinfo == s_leaftypeinfo) {
                    return this->repr.data.leaf->count;
                }
                else {
                    return this->repr.data.node->count;
                }
            }
        }

        PosRBTreeLeaf<T, K>* getLeaf(int64_t index) const
        {
            if(this->repr.typeinfo == s_leaftypeinfo) {
                return this->repr.data.leaf;
            }
            else {
                assert(false); // Not Implemented: full getLeaf for PosRBTree
                return nullptr;
            }
        }

        static T gethelper(int64_t index, const PosRBTreeRepr<T, K>& cur) 
        {
            assert(cur.typeinfo != nullptr);

            if(cur.typeinfo == s_leaftypeinfo) {
                return cur.data.leaf->data[index];
            }
            else {
                const int64_t lcount = cur.data.node->left.data.node->count;
                if(index < lcount) {
                    return gethelper(index, cur.data.node->left);
                }
                else {
                    return gethelper(index - lcount, cur.data.node->right);
                }
            }
        }

        T get(int64_t index) const
        {
            return gethelper(index, this->repr);
        }

        static PosRBTreeRepr<T, K> inserthelper(int64_t index, const T& value, const PosRBTreeRepr<T, K>& cur)
        {
            assert(cur.typeinfo != nullptr);

            if(cur.typeinfo == s_leaftypeinfo) {
                const int64_t cur_count = cur.data.leaf->count;
                if(cur_count < K) {
                    return mkwleafRepr(s_leafallocator->allocate(cur.data.leaf->insert(index, value)));
                }
                else {
                    constexpr int64_t midpt = K / 2;
                    PosRBTreeLeaf<T, K> nlleaf, nrleaf;
                    if(index < midpt) {
                        nlleaf = cur.data.leaf->subsetinsert(0, index, midpt, value);
                        nrleaf = cur.data.leaf->subset(midpt, K - midpt);
                    }
                    else {
                        nlleaf = cur.data.leaf->subset(0, midpt);
                        nrleaf = cur.data.leaf->subsetinsert(midpt, index, K - midpt, value);
                    }

                    return mkwnodeRepr(s_nodeallocator->allocate(cur_count + 1, RColor::Red, 
                        mkwleafRepr(s_leafallocator->allocate(nlleaf)), 
                        mkwleafRepr(s_leafallocator->allocate(nrleaf)))); 
                }
            }
            else {
                PosRBTreeRepr<T, K> nl, nr;
                const int64_t lcount = getReprCount(cur.data.node->left);
                if(index < lcount) {
                    nl = inserthelper(index, value, cur.data.node->left);
                    nr = cur.data.node->right;
                }
                else {
                    nl = cur.data.node->left;
                    nr = inserthelper(index - lcount, value, cur.data.node->right); 
                }

                return balance(mkwnodeRepr(s_nodeallocator->allocate(getReprCount(nl) + getReprCount(nr), cur.data.node->color, nl, nr)));
            }
        }

        PosRBTree<T, K, TreeID> insert(int64_t index, const T& value) const
        {
            PosRBTree<T, K, TreeID> res(inserthelper(index, value, this->repr)); 
            if(res.repr.typeinfo == s_nodetypeinfo) {  
                res.repr.data.node->color = RColor::Black;
                res = PosRBTree<T, K, TreeID>(balance(res.repr));
            } 

            assert(checkRBInvariants(res));

            return res;
        }

        static PosRBTreeRepr<T, K> bubble(RColor c, const PosRBTreeRepr<T, K>& l, const PosRBTreeRepr<T, K>& r)
        {
            if(getReprColor(l) == RColor::BBlack || getReprColor(r) == RColor::BBlack) {
                return balance(createReprFromLR(blacken(c), reddenRepr(l), reddenRepr(r)));
            }

            return createReprFromLR(c, l, r);
        }

        static PosRBTreeRepr<T, K> delhelper(int64_t index, const PosRBTreeRepr<T, K>& cur)
        {
            assert(cur.typeinfo != nullptr);

            if(cur.typeinfo == s_leaftypeinfo) {
                const int64_t cur_count = cur.data.leaf->count;
                if(cur_count > 1) {
                    return mkwleafRepr(s_leafallocator->allocate(cur.data.leaf->del(index)));
                }
                else {
                    const RColor cc = cur.data.leaf->color;
                    if(cc == RColor::Red) {
                        return mkwemptyRepr(PosRBTreeEmpty{});
                    }
                    if(cc == RColor::Black) {
                        return mkwemptyRepr(PosRBTreeEmpty::mkBBlackEmpty());
                    }
                    
                    assert(false && "attempted to delete non red or black leaf!");
                }
            }
            else {
                PosRBTreeRepr<T, K> nl, nr;
                const int64_t lcount = getReprCount(cur.data.node->left);
                if(index < lcount) {
                    nl = delhelper(index, cur.data.node->left);
                    nr = cur.data.node->right;
                }
                else {
                    nl = cur.data.node->left;
                    nr = delhelper(index - lcount, cur.data.node->right); 
                }

                return bubble(cur.data.node->color, nl, nr);
            }
        }

        PosRBTree<T, K, TreeID> del(int64_t index) const
        {
            PosRBTree<T, K, TreeID> res(delhelper(index, this->repr));
            if(res.repr.typeinfo == s_nodetypeinfo) { 
                res.repr.data.node->color = RColor::Black;
                res = PosRBTree<T, K, TreeID>(balance(res.repr));
            }

            assert(checkRBInvariants(res));

            return res;
        }
    };

    template<typename T, int64_t K, uint32_t TreeID> 
    consteval TypeInfo g_typeinfo_PosRBTree_generate(uint32_t tid, const char* tname)
    {
        return TypeInfo {
            tid,
            sizeof(PosRBTree<T, K, TreeID>),
            byteSizeToSlotCount(sizeof(PosRBTree<T, K, TreeID>)),
            LayoutTag::Tagged,
            BSQ_TYPEINFO_NO_ESLOT,
            "20",
            nullptr,
            0,
            nullptr,
            0,
            nullptr,
            0,
            tname
        };
    }
}