import { expect } from "chai";
import { prepare, deploy, getBigNumber, createSLP } from "./utilities"

describe("TurkMaker", function () {
  before(async function () {
    await prepare(this, ["TurkMaker", "TurkBar", "TurkMakerExploitMock", "ERC20Mock", "UniswapV2Factory", "UniswapV2Pair"])
  })

  beforeEach(async function () {
    await deploy(this, [
      ["turk", this.ERC20Mock, ["SUSHI", "SUSHI", getBigNumber("10000000")]],
      ["dai", this.ERC20Mock, ["DAI", "DAI", getBigNumber("10000000")]],
      ["mic", this.ERC20Mock, ["MIC", "MIC", getBigNumber("10000000")]],
      ["usdc", this.ERC20Mock, ["USDC", "USDC", getBigNumber("10000000")]],
      ["weth", this.ERC20Mock, ["WETH", "ETH", getBigNumber("10000000")]],
      ["strudel", this.ERC20Mock, ["$TRDL", "$TRDL", getBigNumber("10000000")]],
      ["factory", this.UniswapV2Factory, [this.alice.address]],
    ])
    await deploy(this, [["bar", this.TurkBar, [this.turk.address]]])
    await deploy(this, [["turkMaker", this.TurkMaker, [this.factory.address, this.bar.address, this.turk.address, this.weth.address]]])
    await deploy(this, [["exploiter", this.TurkMakerExploitMock, [this.turkMaker.address]]])
    await createSLP(this, "turkEth", this.turk, this.weth, getBigNumber(10))
    await createSLP(this, "strudelEth", this.strudel, this.weth, getBigNumber(10))
    await createSLP(this, "daiEth", this.dai, this.weth, getBigNumber(10))
    await createSLP(this, "usdcEth", this.usdc, this.weth, getBigNumber(10))
    await createSLP(this, "micUSDC", this.mic, this.usdc, getBigNumber(10))
    await createSLP(this, "turkUSDC", this.turk, this.usdc, getBigNumber(10))
    await createSLP(this, "daiUSDC", this.dai, this.usdc, getBigNumber(10))
    await createSLP(this, "daiMIC", this.dai, this.mic, getBigNumber(10))
  })
  describe("setBridge", function () {
    it("does not allow to set bridge for Turk", async function () {
      await expect(this.turkMaker.setBridge(this.turk.address, this.weth.address)).to.be.revertedWith("TurkMaker: Invalid bridge")
    })

    it("does not allow to set bridge for WETH", async function () {
      await expect(this.turkMaker.setBridge(this.weth.address, this.turk.address)).to.be.revertedWith("TurkMaker: Invalid bridge")
    })

    it("does not allow to set bridge to itself", async function () {
      await expect(this.turkMaker.setBridge(this.dai.address, this.dai.address)).to.be.revertedWith("TurkMaker: Invalid bridge")
    })

    it("emits correct event on bridge", async function () {
      await expect(this.turkMaker.setBridge(this.dai.address, this.turk.address))
        .to.emit(this.turkMaker, "LogBridgeSet")
        .withArgs(this.dai.address, this.turk.address)
    })
  })
  describe("convert", function () {
    it("should convert SUSHI - ETH", async function () {
      await this.turkEth.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.convert(this.turk.address, this.weth.address)
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turkEth.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turk.balanceOf(this.bar.address)).to.equal("1897569270781234370")
    })

    it("should convert USDC - ETH", async function () {
      await this.usdcEth.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.convert(this.usdc.address, this.weth.address)
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.usdcEth.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turk.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("should convert $TRDL - ETH", async function () {
      await this.strudelEth.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.convert(this.strudel.address, this.weth.address)
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.strudelEth.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turk.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("should convert USDC - SUSHI", async function () {
      await this.turkUSDC.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.convert(this.usdc.address, this.turk.address)
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turkUSDC.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turk.balanceOf(this.bar.address)).to.equal("1897569270781234370")
    })

    it("should convert using standard ETH path", async function () {
      await this.daiEth.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.convert(this.dai.address, this.weth.address)
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.daiEth.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turk.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("converts MIC/USDC using more complex path", async function () {
      await this.micUSDC.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.setBridge(this.usdc.address, this.turk.address)
      await this.turkMaker.setBridge(this.mic.address, this.usdc.address)
      await this.turkMaker.convert(this.mic.address, this.usdc.address)
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.micUSDC.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turk.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("converts DAI/USDC using more complex path", async function () {
      await this.daiUSDC.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.setBridge(this.usdc.address, this.turk.address)
      await this.turkMaker.setBridge(this.dai.address, this.usdc.address)
      await this.turkMaker.convert(this.dai.address, this.usdc.address)
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.daiUSDC.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turk.balanceOf(this.bar.address)).to.equal("1590898251382934275")
    })

    it("converts DAI/MIC using two step path", async function () {
      await this.daiMIC.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.setBridge(this.dai.address, this.usdc.address)
      await this.turkMaker.setBridge(this.mic.address, this.dai.address)
      await this.turkMaker.convert(this.dai.address, this.mic.address)
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.daiMIC.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turk.balanceOf(this.bar.address)).to.equal("1200963016721363748")
    })

    it("reverts if it loops back", async function () {
      await this.daiMIC.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.setBridge(this.dai.address, this.mic.address)
      await this.turkMaker.setBridge(this.mic.address, this.dai.address)
      await expect(this.turkMaker.convert(this.dai.address, this.mic.address)).to.be.reverted
    })

    it("reverts if caller is not EOA", async function () {
      await this.turkEth.transfer(this.turkMaker.address, getBigNumber(1))
      await expect(this.exploiter.convert(this.turk.address, this.weth.address)).to.be.revertedWith("TurkMaker: must use EOA")
    })

    it("reverts if pair does not exist", async function () {
      await expect(this.turkMaker.convert(this.mic.address, this.micUSDC.address)).to.be.revertedWith("TurkMaker: Invalid pair")
    })

    it("reverts if no path is available", async function () {
      await this.micUSDC.transfer(this.turkMaker.address, getBigNumber(1))
      await expect(this.turkMaker.convert(this.mic.address, this.usdc.address)).to.be.revertedWith("TurkMaker: Cannot convert")
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.micUSDC.balanceOf(this.turkMaker.address)).to.equal(getBigNumber(1))
      expect(await this.turk.balanceOf(this.bar.address)).to.equal(0)
    })
  })

  describe("convertMultiple", function () {
    it("should allow to convert multiple", async function () {
      await this.daiEth.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkEth.transfer(this.turkMaker.address, getBigNumber(1))
      await this.turkMaker.convertMultiple([this.dai.address, this.turk.address], [this.weth.address, this.weth.address])
      expect(await this.turk.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.daiEth.balanceOf(this.turkMaker.address)).to.equal(0)
      expect(await this.turk.balanceOf(this.bar.address)).to.equal("3186583558687783097")
    })
  })
})
