// import { Price } from './fractions/price'
import { TokenAmount } from './fractions/tokenAmount'
import invariant from 'tiny-invariant'
import JSBI from 'jsbi'
// import { pack, keccak256 } from '@ethersproject/solidity'
// import { getCreate2Address } from '@ethersproject/address'

import {
  BigintIsh,
  // FACTORY_ADDRESS,
  // INIT_CODE_HASH,
  // MINIMUM_LIQUIDITY,
  ZERO,
  // ONE,
  // FIVE,
  TEN,
  // FEES_NUMERATOR,
  // FEES_DENOMINATOR,
  _20,
  _10000,
  _9980,
  ChainId
} from '../constants'
import { parseBigintIsh } from '../utils'
// import { InsufficientReservesError, InsufficientInputAmountError } from '../errors'
import { Token } from './token'


export class Path {
  public readonly tokenIn: Token
  public readonly tokenOut: Token
  public readonly prices: BigintIsh[]
  public readonly depths: BigintIsh[]
  public readonly decimals: number

  public constructor(tokenIn: Token, tokenOut: Token, prices: BigintIsh[], depths: BigintIsh[], decimals: number) {
    this.tokenIn = tokenIn
    this.tokenOut = tokenOut
    this.prices = prices
    this.depths = depths
    this.decimals = decimals
  }



  public static calcAmountOut(amount: JSBI, price: JSBI, priceDecimals: number): JSBI {
    if(priceDecimals > 0) {
      const power = JSBI.exponentiate(TEN, parseBigintIsh(priceDecimals.toString()))
      return JSBI.divide(JSBI.multiply(amount, power), price)
    } else {  
      const power = JSBI.exponentiate(TEN, parseBigintIsh((-priceDecimals).toString()))  
      return JSBI.divide(JSBI.divide(amount, power), price)
    }
  }

  public static calcAmountIn(amount: JSBI, price: JSBI, priceDecimals: number): JSBI {
    if(priceDecimals > 0) {
      const power = JSBI.exponentiate(TEN, parseBigintIsh(priceDecimals.toString()))
      return JSBI.divide(JSBI.multiply(amount, price), power)
    } else {
      const power = JSBI.exponentiate(TEN, parseBigintIsh((-priceDecimals).toString()))  
      return JSBI.multiply(JSBI.multiply(amount, price), power)
    }
  }

  public getOutputAmount(inputAmount: TokenAmount): [ TokenAmount, TokenAmount, Path ] {
    invariant(this.tokenOut.equals(inputAmount.token), 'TOKEN')

    let inputRaw = inputAmount.raw
    let outputRaw = ZERO
    let freshDepths = this.depths.slice(0)

    for (let i = 0; i < this.prices.length; i++) {
      const price = parseBigintIsh(this.prices[i])
      const depth = parseBigintIsh(this.depths[i])
      if(JSBI.equal(depth, ZERO)) continue


      const amountWithFee = JSBI.divide(JSBI.multiply(depth, _10000), _9980)

      if(JSBI.greaterThanOrEqual(inputAmount.raw, amountWithFee)) {
        inputRaw = JSBI.subtract(inputRaw, amountWithFee)
        outputRaw = JSBI.add(outputRaw, Path.calcAmountOut(depth, price, this.decimals))
        freshDepths[i] = ZERO.toString()
      } else {
        const takeFee = JSBI.divide(JSBI.multiply(inputRaw, _20), _10000)
        outputRaw = JSBI.add(outputRaw, Path.calcAmountOut(JSBI.subtract(inputRaw, takeFee), price, this.decimals))
        freshDepths[i] = JSBI.subtract(parseBigintIsh(freshDepths[i]), JSBI.subtract(inputRaw, takeFee)).toString()
        inputRaw = ZERO
        break
      }
    }

    const amountReturn = new TokenAmount(inputAmount.token, inputRaw)

    const freshPath = new Path(this.tokenIn, this.tokenOut, this.prices, freshDepths, this.decimals)

    const outputAmount = new TokenAmount(this.tokenIn, outputRaw)

    return [ outputAmount, amountReturn, freshPath]
  }

  public getInputAmount(outputAmount: TokenAmount): [ TokenAmount, TokenAmount, Path ] {
    invariant(this.tokenIn.equals(outputAmount.token), 'TOKEN')

    let outputRaw = outputAmount.raw
    let inputRaw = ZERO
    let freshDepths = this.depths.slice(0)

    for (let i = 0; i < this.prices.length; i++) {
      const price = parseBigintIsh(this.prices[i])
      let depth = parseBigintIsh(this.depths[i])
      
      if(JSBI.equal(depth, ZERO)) continue
        
      const amountOutMax = Path.calcAmountOut(depth, price, this.decimals)

      if(JSBI.greaterThan(outputRaw, amountOutMax)) {
        const depthWithFee = JSBI.divide(JSBI.multiply(depth, _10000), _9980)
        inputRaw = JSBI.add(inputRaw, depthWithFee)
        outputRaw = JSBI.subtract(outputRaw, amountOutMax)
        freshDepths[i] = ZERO.toString()
      } else {
        const input = Path.calcAmountIn(outputRaw, price, this.decimals)
        const inputWithFee = JSBI.divide(JSBI.multiply(input, _10000), _9980)

        freshDepths[i] = JSBI.subtract(depth, input).toString()
        inputRaw = JSBI.add(inputRaw, inputWithFee)
        outputRaw = ZERO
        break
      }
    }

    const inputAmount = new TokenAmount(this.tokenOut, inputRaw)

    const amountReturn = new TokenAmount(outputAmount.token, outputRaw)

    const freshPath = new Path(this.tokenIn, this.tokenOut, this.prices, freshDepths, this.decimals)

    return [ inputAmount, amountReturn, freshPath ]
  }

  public get tradeTokenOut(): Token {
    return this.tokenIn
  }

  public get chainId(): ChainId {
    return this.tokenIn.chainId
  }
}
