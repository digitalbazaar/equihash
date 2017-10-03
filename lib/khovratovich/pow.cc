/**
 * Code by Dmitry Khovratovich, 2016
 * CC0 license
 */

#include "pow.h"
#include "blake/blake2.h"
#include <algorithm>
#include <cstring>
#if defined(__APPLE__)
    // TODO: only use this if endian.h does not exist
    // mac os x support
    #include <libkern/OSByteOrder.h>
    #define htole32(x) OSSwapHostToLittleInt32(x)
    #define le32toh(x) OSSwapLittleToHostInt32(x)
#else
    #include <endian.h>
#endif

/*
static uint64_t rdtsc(void) {
#ifdef _MSC_VER
    return __rdtsc();
#else
#if defined(__amd64__) || defined(__x86_64__)
    uint64_t rax, rdx;
    __asm__ __volatile__("rdtsc" : "=a"(rax), "=d"(rdx) : : );
    return (rdx << 32) | rax;
#elif defined(__i386__) || defined(__i386) || defined(__X86__)
    uint64_t rax;
    __asm__ __volatile__("rdtsc" : "=A"(rax) : : );
    return rax;
#else
#error "Not implemented!"
#endif
#endif
}
*/

using namespace std;

void Equihash::InitializeMemory()
{
    uint32_t tuple_n = ((uint32_t)1) << (n / (k + 1));
    Tuple default_tuple(k); // k blocks to store (one left for index)
    std::vector<Tuple> def_tuples(LIST_LENGTH, default_tuple);
    tupleList = std::vector<std::vector<Tuple>>(tuple_n, def_tuples);
    filledList= std::vector<unsigned>(tuple_n, 0);
    solutions.resize(0);
    forks.resize(0);
}

void Equihash::PrintTuples(FILE* fp) {
    unsigned count = 0;
    for (unsigned i = 0; i < tupleList.size(); ++i) {
        for (unsigned m = 0; m < filledList[i]; ++m) {
            fprintf(fp, "[%d][%d]:", i,m);
            for (unsigned j = 0; j < tupleList[i][m].blocks.size(); ++j)
                fprintf(fp, " %x ", tupleList[i][m].blocks[j]);
            fprintf(fp, " || %x", tupleList[i][m].reference);
            fprintf(fp, " |||| ");
        }
        count += filledList[i];
        fprintf(fp, "\n");
    }
    fprintf(fp, "TOTAL: %d elements printed", count);
}

void Equihash::InitializeBaseHashState() {
    blake2b_state *state = (blake2b_state*)baseHashState;
    blake2b_param P =
    {
        sizeof(uint32_t) * MAX_N / 4,
        0,
        1,
        1,
        0,
        0,
        0,
        0,
        {0},
        {0},
        {0}
    };
    std::memcpy(
            P.personal, personal.data(),
            std::min(personal.size(), (size_t)BLAKE2B_PERSONALBYTES));
    blake2b_init_param(state, &P);
    blake2b_update(state, seed.data(), seed.size());
}

void Equihash::InitializeNonceBaseHashState() {
    blake2b_state *state = (blake2b_state*)nonceBaseHashState;
    // copy base state and update with nonce
    state[0] = *((blake2b_state*)baseHashState);
    blake2b_update(state, nonce.data(), nonce.size());
}

//works for k<=7
void Equihash::FillMemory(uint32_t length)
{
    uint32_t buf[MAX_N / 4];

    for (uint32_t i = 0; i < length; ++i) {
        // copy state
        blake2b_state next_state = *((blake2b_state*)nonceBaseHashState);
        // update with next input
        uint32_t input = htole32(i);
        //printf("INP %d\n", input);
        blake2b_update(&next_state, (uint8_t*)&input, sizeof(uint32_t));
        // finalize
        blake2b_final(&next_state, (uint8_t*)buf, sizeof(buf));

        uint32_t index = buf[0] >> (32 - n / (k + 1));
        unsigned count = filledList[index];
        if (count < LIST_LENGTH) {
            for (unsigned j = 1; j < (k + 1); ++j) {
                //select j-th block of n/(k+1) bits
                tupleList[index][count].blocks[j - 1] = buf[j] >> (32 - n / (k + 1));
            }
            tupleList[index][count].reference = i;
            filledList[index]++;
        }
    }
}

std::vector<Input> Equihash::ResolveTreeByLevel(Fork fork, unsigned level) {
    if (level == 0) {
        std::vector<Input> v(2);
        v[0] = fork.ref1;
        v[1] = fork.ref2;
        return v;
    }
    auto v1 = ResolveTreeByLevel(forks[level - 1][fork.ref1], level - 1);
    auto v2 = ResolveTreeByLevel(forks[level - 1][fork.ref2], level - 1);
    v1.insert(v1.end(), v2.begin(), v2.end());
    return v1;
}

std::vector<Input> Equihash::ResolveTree(Fork fork) {
    return ResolveTreeByLevel(fork, forks.size());
}

void Equihash::ResolveCollisions(bool store) {
    const unsigned tableLength = tupleList.size();  //number of rows in the hashtable
    const unsigned maxNewCollisions = tupleList.size()*FORK_MULTIPLIER;  //max number of collisions to be found
    const unsigned newBlocks = tupleList[0][0].blocks.size() - 1;// number of blocks in the future collisions
    std::vector<Fork> newForks(maxNewCollisions); //list of forks created at this step
    auto tableRow = vector<Tuple>(LIST_LENGTH, Tuple(newBlocks)); //Row in the hash table
    vector<vector<Tuple>> collisionList(tableLength,tableRow);
    std::vector<unsigned> newFilledList(tableLength,0);  //number of entries in rows
    uint32_t newColls = 0; //collision counter
    for (unsigned i = 0; i < tableLength; ++i) {
        for (unsigned j = 0; j < filledList[i]; ++j)        {
            for (unsigned m = j + 1; m < filledList[i]; ++m) {   //Collision
                //New index
                uint32_t newIndex = tupleList[i][j].blocks[0] ^ tupleList[i][m].blocks[0];
                Fork newFork = Fork(tupleList[i][j].reference, tupleList[i][m].reference);
                //Check if we get a solution
                if (store) {  //last step
                    if (newIndex == 0) {//Solution
                        std::vector<Input> solution_inputs = ResolveTree(newFork);
                        solutionCount++;
                        // distinct indices check
                        if (HasDistinctIndicies(solution_inputs)) {
                            distinctCount++;
                            if (HasDifficulty(solution_inputs)) {
                                difficultCount++;
                                // order tree and save
                                OrderSolution(solution_inputs);
                                solutions.push_back(Proof(n, k, personal, seed, nonce, solution_inputs));
                                // TODO: support returning more solutions?
                                // only need one solution, return
                                return;
                            }
                        }
                    }
                }
                else {         //Resolve
                    if (newFilledList[newIndex] < LIST_LENGTH && newColls < maxNewCollisions) {
                        for (unsigned l = 0; l < newBlocks; ++l) {
                            collisionList[newIndex][newFilledList[newIndex]].blocks[l]
                                = tupleList[i][j].blocks[l+1] ^ tupleList[i][m].blocks[l+1];
                        }
                        newForks[newColls] = newFork;
                        collisionList[newIndex][newFilledList[newIndex]].reference = newColls;
                        newFilledList[newIndex]++;
                        newColls++;
                    }//end of adding collision
                }
            }
        }//end of collision for i
    }
    forks.push_back(newForks);
    std::swap(tupleList, collisionList);
    std::swap(filledList, newFilledList);
}

bool Equihash::HasDistinctIndicies(Solution &solution) {
    // sort and check for duplicate values
    auto vec = solution;
    std::sort(vec.begin(), vec.end());
    for (size_t k = 0; k < vec.size() - 1; ++k) {
        if (vec[k] == vec[k + 1]) {
            return false;
        }
    }
    return true;
}

bool Equihash::HasDifficulty(Solution &solution) {
    blake2b_state state[1];
    uint32_t buf[MAX_N / 4];
    // copy base state
    state[0] = *((blake2b_state*)nonceBaseHashState);

    // update with each solution value
    for (auto d : solution) {
        uint32_t input = htole32(d);
        blake2b_update(state, (uint8_t*)&input, sizeof(uint32_t));
    }
    // finalize
    blake2b_final(state, (uint8_t*)buf, sizeof(buf));
    // check first 53 bits of hash >= difficulty
    // TODO: handle lt/gt 53 bits of difficulty?
    uint64_t bits = ((uint64_t)buf[0] + ((uint64_t)buf[1] << 32)) >> (64 - 53);
    //printf("D B:%0llx D:%0llx\n", bits, difficulty);
    return bits >= difficulty;
}

void Equihash::OrderSolution(Solution &solution) {
    // order tree
    for (size_t level = 0; level < k; ++level) {
        size_t stride = 1 << level;
        for (size_t j = 0; j < solution.size(); j += (2 * stride)) {
            if (solution[j] >= solution[j + stride]) {
                // swap branches
                std::swap_ranges(
                        solution.begin() + j,
                        solution.begin() + j + stride,
                        solution.begin() + j + stride);
            }
        }
    }
}

void Equihash::IncrementNonce() {
    // increment nonce
    // FIXME: this only finds 32 bit nonces, handle arbitrary byte size
    *((uint32_t *)nonce.data()) =
        htole32(le32toh(*((uint32_t *)nonce.data())) + 1);
}

Proof Equihash::FindProof() {
    // allocate base and per-nonce hash state
    blake2b_state baseState[1];
    blake2b_state nonceBaseState[1];
    baseHashState = baseState;
    nonceBaseHashState = nonceBaseState;

    InitializeBaseHashState();

    nonceCount = 0;
    solutionCount = 0;
    distinctCount = 0;
    difficultCount = 0;

    //FILE* fp = fopen("proof.log", "w+");
    //fclose(fp);
    for(uint32_t count = 0; count < maxNonces; ++count) {
        nonceCount++;
        /*
        if(count % 10 == 0) {
            printf("[%d] stats S:%u U:%d D:%u\n",
                    nonceCount, solutionCount, distinctCount, difficultCount);
        }
        */
        //uint64_t start_cycles = rdtsc();
        InitializeMemory(); //allocate
        InitializeNonceBaseHashState();
        FillMemory(4UL << (n / (k + 1)-1));   //fill with hashes
        //uint64_t fill_end = rdtsc();
        //printf("[%d] FillMemory Mcycles=%2.2f\n", count, (double)(fill_end - start_cycles) / (1UL << 20));
        for (unsigned i = 1; i <= k; ++i) {
            //uint64_t resolve_start = rdtsc();
            bool to_store = (i == k);
            ResolveCollisions(to_store); //XOR collisions, concatenate indices and shift
            //uint64_t resolve_end = rdtsc();
            //printf("[%d] ResolveCollisions Mcycles=%2.2f\n", count, (double)(resolve_end - resolve_start) / (1UL << 20));
        }
        //uint64_t stop_cycles = rdtsc();

        //double  mcycles_d = (double)(stop_cycles - start_cycles) / (1UL << 20);
        //uint32_t kbytes = (tupleList.size()*LIST_LENGTH*k*sizeof(uint32_t)) / (1UL << 10);
        //printf("[%d] total time n=%d k=%d sols=%d KiB=%d Mcycles=%2.2f\n",
        //    count, n, k, solutions.size(), kbytes, mcycles_d);

        // check for a valid solution
        //printf("NonceCount:%d sols:%d\n", count, solutions.size());
        if(solutions.size() > 0) {
            //printf("Found @ NonceCount:%d\n", count);
            return solutions[0];
        }
        IncrementNonce();
    }
    return Proof(n, k, personal, seed, nonce, Solution());
}

bool Proof::Test()
{
    blake2b_state state[1];
    uint32_t buf[MAX_N / 4];
    std::vector<uint32_t> blocks(k+1, 0);
    blake2b_param P =
    {
        sizeof(buf),
        0,
        1,
        1,
        0,
        0,
        0,
        0,
        {0},
        {0},
        {0}
    };
    std::memcpy(
            P.personal, personal.data(),
            std::min(personal.size(), (size_t)BLAKE2B_PERSONALBYTES));
    blake2b_init_param(state, &P);
    blake2b_update(state, seed.data(), seed.size());
    blake2b_update(state, nonce.data(), nonce.size());

    for (size_t i = 0; i < solution.size(); ++i) {
        // copy state
        blake2b_state next_state = state[0];
        // update with next input
        uint32_t input = htole32(solution[i]);
        blake2b_update(&next_state, (uint8_t*)&input, sizeof(uint32_t));
        // finalize
        blake2b_final(&next_state, (uint8_t*)buf, sizeof(buf));

        for (unsigned j = 0; j < (k + 1); ++j) {
            //select j-th block of n/(k+1) bits
            blocks[j] ^= buf[j] >> (32 - n / (k + 1));
        }
    }
    bool b = true;
    for (unsigned j = 0; j < (k + 1); ++j) {
        b &= (blocks[j] == 0);
    }
    /*
    if (b && inputs.size()!=0)    {
        printf("Solution found:\n");
        for (unsigned i = 0; i < inputs.size(); ++i) {
            printf(" %x ", inputs[i]);
        }
        printf("%i\n", b);
    }*/
    return b && solution.size()!=0;
}
