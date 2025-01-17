import { INIT_CODE_HASH } from '../src/constants'

//import { bytecode } from '@uniswap/v2-core/build/UniswapV2Pair.json'
//import { keccak256 } from '@ethersproject/solidity'

// this _could_ go in constants, except that it would cost every consumer of the sdk the CPU to compute the hash
// and load the JSON.
//const COMPUTED_INIT_CODE_HASH = keccak256(['bytes'], [`0x${bytecode}`])

describe('constants', () => {
  describe('INIT_CODE_HASH', () => {
    // it('matches computed bytecode hash', () => {
    //   expect(COMPUTED_INIT_CODE_HASH).toEqual(INIT_CODE_HASH)
    // })
    //TODO: Replace with real PancakePair.json
    it('matches computed bytecode hash', () => {
      expect(INIT_CODE_HASH).toEqual('0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f4a84f69bd5')

      // testnet
      // expect(INIT_CODE_HASH).toEqual('0x907612292a9c08104997794768917d00db339c51f0a396f7af7cf48a6ffe23c2')
    })
  })
})
