```
➜  ➜  meTokens-core git:(diamond-slither) slither .
'npx hardhat compile --force' running
Compiling 60 files with 0.8.10
Generating typings for: 61 artifacts in dir: artifacts/types for target: ethers-v5
Successfully generated 105 typings!
Solidity compilation finished successfully

Solidity 0.8.10 is not fully supported yet. You can still use Hardhat, but some features, like stack traces, might not work correctly.

Learn more at https://hardhat.org/reference/solidity-support



SameAssetTransferMigration.finishMigration(address) (contracts/migrations/SameAssetTransferMigration.sol#62-89) ignores return value by IERC20(targetHub_.asset).transfer(targetHub_.vault,amountOut) (contracts/migrations/SameAssetTransferMigration.sol#85)
UniswapSingleTransferMigration.finishMigration(address) (contracts/migrations/UniswapSingleTransferMigration.sol#92-123) ignores return value by IERC20(targetHub_.asset).transfer(targetHub_.vault,amountOut) (contracts/migrations/UniswapSingleTransferMigration.sol#119)
Vault.claim(address,bool,uint256) (contracts/vaults/Vault.sol#68-83) ignores return value by IERC20(_asset).transfer(dao,_amount) (contracts/vaults/Vault.sol#81)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unchecked-transfer

Modifiers.s (contracts/libs/Details.sol#71) is never initialized. It is used in:
Modifiers.s (contracts/libs/Details.sol#71) is never initialized. It is used in:
	- FoundryFacet.mint(address,uint256,address) (contracts/facets/FoundryFacet.sol#39-100)
	- FoundryFacet.burn(address,uint256,address) (contracts/facets/FoundryFacet.sol#135-218)
	- FoundryFacet.donate(address,uint256) (contracts/facets/FoundryFacet.sol#220-236)
	- FoundryFacet._calculateMeTokensMinted(address,uint256) (contracts/facets/FoundryFacet.sol#239-302)
	- FoundryFacet._calculateRawAssetsReturned(address,uint256) (contracts/facets/FoundryFacet.sol#304-369)
	- FoundryFacet._calculateActualAssetsReturned(address,address,uint256,uint256) (contracts/facets/FoundryFacet.sol#372-422)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#uninitialized-state-variables

BancorABDK._viewMeTokensMinted(uint256,uint32,uint256,uint256) (contracts/curves/BancorABDK.sol#213-245) performs a multiplication on the result of a division:
	-exponent = uint256(_reserveWeight).fromUInt().div(_maxWeight) (contracts/curves/BancorABDK.sol#234)
	-res = _supply.fromUInt().mul((part1.ln().mul(exponent)).exp().sub(_one)) (contracts/curves/BancorABDK.sol#241-243)
BancorABDK._viewMeTokensMintedFromZero(uint256,uint256,uint256) (contracts/curves/BancorABDK.sol#265-288) performs a multiplication on the result of a division:
	-numerator = _assetsDeposited.fromUInt().mul(_baseX.ln().mul(_one.div(reserveWeight)).exp()) (contracts/curves/BancorABDK.sol#272-274)
BancorABDK._viewMeTokensMintedFromZero(uint256,uint256,uint256) (contracts/curves/BancorABDK.sol#265-288) performs a multiplication on the result of a division:
	-reserveWeight = _reserveWeight.fromUInt().div(_maxWeight) (contracts/curves/BancorABDK.sol#270)
	-denominator = reserveWeight.mul(_baseY.fromUInt()) (contracts/curves/BancorABDK.sol#277)
BancorABDK._viewMeTokensMintedFromZero(uint256,uint256,uint256) (contracts/curves/BancorABDK.sol#265-288) performs a multiplication on the result of a division:
	-reserveWeight = _reserveWeight.fromUInt().div(_maxWeight) (contracts/curves/BancorABDK.sol#270)
	-res = (numerator.div(denominator)).ln().mul(reserveWeight).exp() (contracts/curves/BancorABDK.sol#283-286)
BancorABDK._viewAssetsReturned(uint256,uint32,uint256,uint256) (contracts/curves/BancorABDK.sol#309-350) performs a multiplication on the result of a division:
	-exponent = _one.div(uint256(_reserveWeight).fromUInt().div(_maxWeight)) (contracts/curves/BancorABDK.sol#337-339)
	-res = _balancePooled.fromUInt().sub(_balancePooled.fromUInt().mul(s.ln().mul(exponent).exp())) (contracts/curves/BancorABDK.sol#346-348)
BancorPower._viewMeTokensMintedFromZero(uint256,uint256,uint256) (contracts/curves/BancorPower.sol#228-252) performs a multiplication on the result of a division:
	-numerator = _assetsDeposited.fromUInt().mul(_baseX.ln().mul(_one.div(reserveWeight)).exp()) (contracts/curves/BancorPower.sol#235-237)
BancorPower._viewMeTokensMintedFromZero(uint256,uint256,uint256) (contracts/curves/BancorPower.sol#228-252) performs a multiplication on the result of a division:
	-reserveWeight = _reserveWeight.fromUInt().div(_maxWeight) (contracts/curves/BancorPower.sol#233)
	-denominator = reserveWeight.mul(_baseY.fromUInt()) (contracts/curves/BancorPower.sol#240)
BancorPower._viewMeTokensMintedFromZero(uint256,uint256,uint256) (contracts/curves/BancorPower.sol#228-252) performs a multiplication on the result of a division:
	-reserveWeight = _reserveWeight.fromUInt().div(_maxWeight) (contracts/curves/BancorPower.sol#233)
	-res = (numerator.div(denominator)).ln().mul(reserveWeight).exp() (contracts/curves/BancorPower.sol#246-249)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-x = (x * FIXED_1) / 0xd3094c70f034de4b96ff7d5b6f99fcd8 (contracts/curves/Power.sol#393)
	-x = (x * FIXED_1) / 0xa45af1e1f40c333b3de1db4dd55f29a7 (contracts/curves/Power.sol#397)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-x = (x * FIXED_1) / 0xa45af1e1f40c333b3de1db4dd55f29a7 (contracts/curves/Power.sol#397)
	-x = (x * FIXED_1) / 0x910b022db7ae67ce76b441c27035c6a1 (contracts/curves/Power.sol#401)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-x = (x * FIXED_1) / 0x910b022db7ae67ce76b441c27035c6a1 (contracts/curves/Power.sol#401)
	-x = (x * FIXED_1) / 0x88415abbe9a76bead8d00cf112e4d4a8 (contracts/curves/Power.sol#405)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-x = (x * FIXED_1) / 0x88415abbe9a76bead8d00cf112e4d4a8 (contracts/curves/Power.sol#405)
	-x = (x * FIXED_1) / 0x84102b00893f64c705e841d5d4064bd3 (contracts/curves/Power.sol#409)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-x = (x * FIXED_1) / 0x84102b00893f64c705e841d5d4064bd3 (contracts/curves/Power.sol#409)
	-x = (x * FIXED_1) / 0x8204055aaef1c8bd5c3259f4822735a2 (contracts/curves/Power.sol#413)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-x = (x * FIXED_1) / 0x8204055aaef1c8bd5c3259f4822735a2 (contracts/curves/Power.sol#413)
	-x = (x * FIXED_1) / 0x810100ab00222d861931c15e39b44e99 (contracts/curves/Power.sol#417)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-x = (x * FIXED_1) / 0x810100ab00222d861931c15e39b44e99 (contracts/curves/Power.sol#417)
	-x = (x * FIXED_1) / 0x808040155aabbbe9451521693554f733 (contracts/curves/Power.sol#421)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-w = (y * y) / FIXED_1 (contracts/curves/Power.sol#425)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#429)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#429)
	-res += (z * (0x0aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa - y)) / 0x200000000000000000000000000000000 (contracts/curves/Power.sol#430-432)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-w = (y * y) / FIXED_1 (contracts/curves/Power.sol#425)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#429)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#433)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#433)
	-res += (z * (0x099999999999999999999999999999999 - y)) / 0x300000000000000000000000000000000 (contracts/curves/Power.sol#434-436)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-w = (y * y) / FIXED_1 (contracts/curves/Power.sol#425)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#433)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#437)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#437)
	-res += (z * (0x092492492492492492492492492492492 - y)) / 0x400000000000000000000000000000000 (contracts/curves/Power.sol#438-440)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-w = (y * y) / FIXED_1 (contracts/curves/Power.sol#425)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#437)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#441)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#441)
	-res += (z * (0x08e38e38e38e38e38e38e38e38e38e38e - y)) / 0x500000000000000000000000000000000 (contracts/curves/Power.sol#442-444)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-w = (y * y) / FIXED_1 (contracts/curves/Power.sol#425)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#441)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#445)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#445)
	-res += (z * (0x08ba2e8ba2e8ba2e8ba2e8ba2e8ba2e8b - y)) / 0x600000000000000000000000000000000 (contracts/curves/Power.sol#446-448)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-w = (y * y) / FIXED_1 (contracts/curves/Power.sol#425)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#445)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#449)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#449)
	-res += (z * (0x089d89d89d89d89d89d89d89d89d89d89 - y)) / 0x700000000000000000000000000000000 (contracts/curves/Power.sol#450-452)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-w = (y * y) / FIXED_1 (contracts/curves/Power.sol#425)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#449)
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#453)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) performs a multiplication on the result of a division:
	-z = (z * w) / FIXED_1 (contracts/curves/Power.sol#453)
	-res += (z * (0x088888888888888888888888888888888 - y)) / 0x800000000000000000000000000000000 (contracts/curves/Power.sol#454-456)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#473)
	-res += z * 0x10e1b3be415a0000 (contracts/curves/Power.sol#474)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#473)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#475)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#475)
	-res += z * 0x05a0913f6b1e0000 (contracts/curves/Power.sol#476)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#475)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#477)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#477)
	-res += z * 0x0168244fdac78000 (contracts/curves/Power.sol#478)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#477)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#479)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#479)
	-res += z * 0x004807432bc18000 (contracts/curves/Power.sol#480)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#479)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#481)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#481)
	-res += z * 0x000c0135dca04000 (contracts/curves/Power.sol#482)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#481)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#483)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#483)
	-res += z * 0x0001b707b1cdc000 (contracts/curves/Power.sol#484)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#483)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#485)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#485)
	-res += z * 0x000036e0f639b800 (contracts/curves/Power.sol#486)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#485)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#487)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#487)
	-res += z * 0x00000618fee9f800 (contracts/curves/Power.sol#488)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#487)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#489)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#489)
	-res += z * 0x0000009c197dcc00 (contracts/curves/Power.sol#490)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#489)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#491)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#491)
	-res += z * 0x0000000e30dce400 (contracts/curves/Power.sol#492)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#491)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#493)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#493)
	-res += z * 0x000000012ebd1300 (contracts/curves/Power.sol#494)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#493)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#495)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#495)
	-res += z * 0x0000000017499f00 (contracts/curves/Power.sol#496)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#495)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#497)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#497)
	-res += z * 0x0000000001a9d480 (contracts/curves/Power.sol#498)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#497)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#499)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#499)
	-res += z * 0x00000000001c6380 (contracts/curves/Power.sol#500)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#499)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#501)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#501)
	-res += z * 0x000000000001c638 (contracts/curves/Power.sol#502)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#501)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#503)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#503)
	-res += z * 0x0000000000001ab8 (contracts/curves/Power.sol#504)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#503)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#505)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#505)
	-res += z * 0x000000000000017c (contracts/curves/Power.sol#506)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#505)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#507)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#507)
	-res += z * 0x0000000000000014 (contracts/curves/Power.sol#508)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#507)
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#509)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-z = (z * y) / FIXED_1 (contracts/curves/Power.sol#509)
	-res += z * 0x0000000000000001 (contracts/curves/Power.sol#510)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-res = (res * 0x1c3d6a24ed82218787d624d3e5eba95f9) / 0x18ebef9eac820ae8682b9793ac6d1e776 (contracts/curves/Power.sol#514-516)
	-res = (res * 0x18ebef9eac820ae8682b9793ac6d1e778) / 0x1368b2fc6f9609fe7aceb46aa619baed4 (contracts/curves/Power.sol#518-520)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-res = (res * 0x18ebef9eac820ae8682b9793ac6d1e778) / 0x1368b2fc6f9609fe7aceb46aa619baed4 (contracts/curves/Power.sol#518-520)
	-res = (res * 0x1368b2fc6f9609fe7aceb46aa619baed5) / 0x0bc5ab1b16779be3575bd8f0520a9f21f (contracts/curves/Power.sol#522-524)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-res = (res * 0x1368b2fc6f9609fe7aceb46aa619baed5) / 0x0bc5ab1b16779be3575bd8f0520a9f21f (contracts/curves/Power.sol#522-524)
	-res = (res * 0x0bc5ab1b16779be3575bd8f0520a9f21e) / 0x0454aaa8efe072e7f6ddbab84b40a55c9 (contracts/curves/Power.sol#526-528)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-res = (res * 0x0bc5ab1b16779be3575bd8f0520a9f21e) / 0x0454aaa8efe072e7f6ddbab84b40a55c9 (contracts/curves/Power.sol#526-528)
	-res = (res * 0x0454aaa8efe072e7f6ddbab84b40a55c5) / 0x00960aadc109e7a3bf4578099615711ea (contracts/curves/Power.sol#530-532)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-res = (res * 0x0454aaa8efe072e7f6ddbab84b40a55c5) / 0x00960aadc109e7a3bf4578099615711ea (contracts/curves/Power.sol#530-532)
	-res = (res * 0x00960aadc109e7a3bf4578099615711d7) / 0x0002bf84208204f5977f9a8cf01fdce3d (contracts/curves/Power.sol#534-536)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) performs a multiplication on the result of a division:
	-res = (res * 0x00960aadc109e7a3bf4578099615711d7) / 0x0002bf84208204f5977f9a8cf01fdce3d (contracts/curves/Power.sol#534-536)
	-res = (res * 0x0002bf84208204f5977f9a8cf01fdc307) / 0x0000003c6ab775dd0b95b4cbee7e65d11 (contracts/curves/Power.sol#538-540)
StepwiseCurve._viewMeTokensMinted(uint256,uint256,uint256,uint256,uint256) (contracts/curves/StepwiseCurve.sol#183-221) performs a multiplication on the result of a division:
	-balancePooledAtCurrentSteps = ((stepsAfterMint * stepsAfterMint + stepsAfterMint) / 2) * _stepX * _stepY (contracts/curves/StepwiseCurve.sol#199-203)
StepwiseCurve._viewMeTokensMinted(uint256,uint256,uint256,uint256,uint256) (contracts/curves/StepwiseCurve.sol#183-221) performs a multiplication on the result of a division:
	-stepsAfterMint = (((_balancePooled + _assetsDeposited) * _stepX * _stepX) / ((_stepX * _stepY) / 2)) (contracts/curves/StepwiseCurve.sol#196-198)
	-supplyAfterMint = _stepX * stepsAfterMint - (balancePooledAtCurrentSteps - (_balancePooled + _assetsDeposited)) / (_stepY * stepsAfterMint) (contracts/curves/StepwiseCurve.sol#206-211)
StepwiseCurve._viewMeTokensMinted(uint256,uint256,uint256,uint256,uint256) (contracts/curves/StepwiseCurve.sol#183-221) performs a multiplication on the result of a division:
	-stepsAfterMint = (((_balancePooled + _assetsDeposited) * _stepX * _stepX) / ((_stepX * _stepY) / 2)) (contracts/curves/StepwiseCurve.sol#196-198)
	-supplyAfterMint = _stepX * stepsAfterMint + ((_balancePooled + _assetsDeposited) - balancePooledAtCurrentSteps) / (_stepY * (stepsAfterMint + 1)) (contracts/curves/StepwiseCurve.sol#213-218)
StepwiseCurve._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256) (contracts/curves/StepwiseCurve.sol#231-268) performs a multiplication on the result of a division:
	-steps = _supply / _stepX (contracts/curves/StepwiseCurve.sol#247)
	-supplyAtCurrentStep = _supply - (steps * _stepX) (contracts/curves/StepwiseCurve.sol#248)
StepwiseCurve._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256) (contracts/curves/StepwiseCurve.sol#231-268) performs a multiplication on the result of a division:
	-stepsAfterBurn = (_supply - _meTokensBurned) / _stepX (contracts/curves/StepwiseCurve.sol#249)
	-supplyAtStepAfterBurn = _supply - (stepsAfterBurn * _stepX) (contracts/curves/StepwiseCurve.sol#250)
StepwiseCurve._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256) (contracts/curves/StepwiseCurve.sol#231-268) performs a multiplication on the result of a division:
	-balancePooledAtCurrentSteps = ((steps * steps + steps) / 2) * _stepX * _stepY (contracts/curves/StepwiseCurve.sol#252-254)
StepwiseCurve._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256) (contracts/curves/StepwiseCurve.sol#231-268) performs a multiplication on the result of a division:
	-balancePooledAtStepsAfterBurn = ((stepsAfterBurn * stepsAfterBurn + stepsAfterBurn) / 2) * _stepX * _stepY (contracts/curves/StepwiseCurve.sol#255-259)
StepwiseCurveABDK._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256) (contracts/curves/StepwiseCurveABDK.sol#236-271) performs a multiplication on the result of a division:
	-newSupplyInStep = supply_.sub(meTokensBurned_).sub(newSteps.mul(stepX_)).div(_precision) (contracts/curves/StepwiseCurveABDK.sol#263-266)
	-newCollateralInBalance = (newSteps.mul(stepX_).mul(stepY_).div(_precision)).add((newSteps.add(_one)).mul(newSupplyInStep).mul(stepY_)) (contracts/curves/StepwiseCurveABDK.sol#267-269)
FoundryFacet._calculateActualAssetsReturned(address,address,uint256,uint256) (contracts/facets/FoundryFacet.sol#372-422) performs a multiplication on the result of a division:
	-actualAssetsReturned = rawAssetsReturned + (((s.PRECISION * _meTokensBurned) / IERC20(_meToken).totalSupply()) * meToken_.balanceLocked) / s.PRECISION (contracts/facets/FoundryFacet.sol#384-388)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#divide-before-multiply

MeTokenRegistryFacet.claimMeTokenOwnership(address) (contracts/facets/MeTokenRegistryFacet.sol#243-259) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == s.pendingMeTokenOwners[_oldOwner],!_pendingOwner) (contracts/facets/MeTokenRegistryFacet.sol#245-248)
Modifiers.onlyCurveRegistry() (contracts/libs/Details.sol#111-114) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == address(s.curveRegistry),!curveRegistry) (contracts/libs/Details.sol#112)
Modifiers.onlyDeactivateController() (contracts/libs/Details.sol#101-104) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == s.deactivateController,!deactivateController) (contracts/libs/Details.sol#102)
Modifiers.onlyDiamondController() (contracts/libs/Details.sol#73-76) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == s.diamondController,!diamondController) (contracts/libs/Details.sol#74)
Modifiers.onlyDurationsController() (contracts/libs/Details.sol#83-86) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == s.durationsController,!durationsController) (contracts/libs/Details.sol#84)
Modifiers.onlyFeesController() (contracts/libs/Details.sol#78-81) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == s.feesController,!feesController) (contracts/libs/Details.sol#79)
Modifiers.onlyMeTokenRegistryController() (contracts/libs/Details.sol#88-94) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == s.meTokenRegistryController,!meTokenRegistryController) (contracts/libs/Details.sol#89-92)
Modifiers.onlyMigrationRegistry() (contracts/libs/Details.sol#116-122) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == address(s.migrationRegistry),!migrationRegistry) (contracts/libs/Details.sol#117-120)
Modifiers.onlyRegisterController() (contracts/libs/Details.sol#96-99) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == s.registerController,!registerController) (contracts/libs/Details.sol#97)
Modifiers.onlyVaultRegistry() (contracts/libs/Details.sol#106-109) uses a dangerous strict equality:
	- require(bool,string)(msg.sender == address(s.vaultRegistry),!vaultRegistry) (contracts/libs/Details.sol#107)
MeTokenRegistryFacet.transferMeTokenOwnership(address) (contracts/facets/MeTokenRegistryFacet.sol#216-228) uses a dangerous strict equality:
	- require(bool,string)(s.pendingMeTokenOwners[msg.sender] == address(0),transfer ownership already pending) (contracts/facets/MeTokenRegistryFacet.sol#217-220)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#dangerous-strict-equalities

Reentrancy in UniswapSingleTransferMigration._swap(address) (contracts/migrations/UniswapSingleTransferMigration.sol#161-208):
	External calls:
	- IERC20(hub_.asset).approve(address(_router),amountIn) (contracts/migrations/UniswapSingleTransferMigration.sol#186)
	State variables written after the call(s):
	- usts_.swapped = true (contracts/migrations/UniswapSingleTransferMigration.sol#201)
Reentrancy in SameAssetTransferMigration.finishMigration(address) (contracts/migrations/SameAssetTransferMigration.sol#62-89):
	External calls:
	- ISingleAssetVault(hub_.vault).startMigration(_meToken) (contracts/migrations/SameAssetTransferMigration.sol#79)
	State variables written after the call(s):
	- usts_.started = true (contracts/migrations/SameAssetTransferMigration.sol#80)
Reentrancy in SameAssetTransferMigration.finishMigration(address) (contracts/migrations/SameAssetTransferMigration.sol#62-89):
	External calls:
	- ISingleAssetVault(hub_.vault).startMigration(_meToken) (contracts/migrations/SameAssetTransferMigration.sol#79)
	- IERC20(targetHub_.asset).transfer(targetHub_.vault,amountOut) (contracts/migrations/SameAssetTransferMigration.sol#85)
	State variables written after the call(s):
	- delete _sameAssetMigration[_meToken] (contracts/migrations/SameAssetTransferMigration.sol#88)
Reentrancy in UniswapSingleTransferMigration.finishMigration(address) (contracts/migrations/UniswapSingleTransferMigration.sol#92-123):
	External calls:
	- ISingleAssetVault(hub_.vault).startMigration(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#110)
	State variables written after the call(s):
	- usts_.started = true (contracts/migrations/UniswapSingleTransferMigration.sol#111)
Reentrancy in UniswapSingleTransferMigration.finishMigration(address) (contracts/migrations/UniswapSingleTransferMigration.sol#92-123):
	External calls:
	- ISingleAssetVault(hub_.vault).startMigration(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#110)
	- amountOut = _swap(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#112)
		- IERC20(hub_.asset).approve(address(_router),amountIn) (contracts/migrations/UniswapSingleTransferMigration.sol#186)
		- amountOut = _router.exactInputSingle(params) (contracts/migrations/UniswapSingleTransferMigration.sol#204)
		- meTokenRegistry.updateBalances(_meToken,amountOut) (contracts/migrations/UniswapSingleTransferMigration.sol#207)
	State variables written after the call(s):
	- amountOut = _swap(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#112)
		- usts_.swapped = true (contracts/migrations/UniswapSingleTransferMigration.sol#201)
Reentrancy in UniswapSingleTransferMigration.finishMigration(address) (contracts/migrations/UniswapSingleTransferMigration.sol#92-123):
	External calls:
	- ISingleAssetVault(hub_.vault).startMigration(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#110)
	- amountOut = _swap(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#112)
		- IERC20(hub_.asset).approve(address(_router),amountIn) (contracts/migrations/UniswapSingleTransferMigration.sol#186)
		- amountOut = _router.exactInputSingle(params) (contracts/migrations/UniswapSingleTransferMigration.sol#204)
		- meTokenRegistry.updateBalances(_meToken,amountOut) (contracts/migrations/UniswapSingleTransferMigration.sol#207)
	- IERC20(targetHub_.asset).transfer(targetHub_.vault,amountOut) (contracts/migrations/UniswapSingleTransferMigration.sol#119)
	State variables written after the call(s):
	- delete _uniswapSingleTransfers[_meToken] (contracts/migrations/UniswapSingleTransferMigration.sol#122)
Reentrancy in MeTokenRegistryFacet.initResubscribe(address,uint256,address,bytes) (contracts/facets/MeTokenRegistryFacet.sol#116-172):
	External calls:
	- require(bool,string)(IVault(_migration).isValid(_meToken,_encodedMigrationArgs),Invalid _encodedMigrationArgs) (contracts/facets/MeTokenRegistryFacet.sol#147-150)
	State variables written after the call(s):
	- meToken_.startTime = block.timestamp + s.meTokenWarmup (contracts/facets/MeTokenRegistryFacet.sol#151)
	- meToken_.endTime = block.timestamp + s.meTokenWarmup + s.meTokenDuration (contracts/facets/MeTokenRegistryFacet.sol#152-155)
	- meToken_.endCooldown = block.timestamp + s.meTokenWarmup + s.meTokenDuration + s.meTokenCooldown (contracts/facets/MeTokenRegistryFacet.sol#156-160)
	- meToken_.targetHubId = _targetHubId (contracts/facets/MeTokenRegistryFacet.sol#161)
	- meToken_.migration = _migration (contracts/facets/MeTokenRegistryFacet.sol#162)
Reentrancy in HubFacet.initUpdate(uint256,address,uint256,bytes) (contracts/facets/HubFacet.sol#98-166):
	External calls:
	- LibHub.finishUpdate(_id) (contracts/facets/HubFacet.sol#107)
	State variables written after the call(s):
	- hub_.targetRefundRatio = _targetRefundRatio (contracts/facets/HubFacet.sol#127)
Reentrancy in HubFacet.initUpdate(uint256,address,uint256,bytes) (contracts/facets/HubFacet.sol#98-166):
	External calls:
	- LibHub.finishUpdate(_id) (contracts/facets/HubFacet.sol#107)
	- ICurve(_targetCurve).register(_id,_encodedCurveDetails) (contracts/facets/HubFacet.sol#141)
	State variables written after the call(s):
	- hub_.targetCurve = _targetCurve (contracts/facets/HubFacet.sol#142)
Reentrancy in SameAssetTransferMigration.poke(address) (contracts/migrations/SameAssetTransferMigration.sol#50-60):
	External calls:
	- ISingleAssetVault(hub_.vault).startMigration(_meToken) (contracts/migrations/SameAssetTransferMigration.sol#57)
	State variables written after the call(s):
	- usts_.started = true (contracts/migrations/SameAssetTransferMigration.sol#58)
Reentrancy in UniswapSingleTransferMigration.poke(address) (contracts/migrations/UniswapSingleTransferMigration.sol#74-90):
	External calls:
	- ISingleAssetVault(hub_.vault).startMigration(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#86)
	State variables written after the call(s):
	- usts_.started = true (contracts/migrations/UniswapSingleTransferMigration.sol#87)
Reentrancy in UniswapSingleTransferMigration.poke(address) (contracts/migrations/UniswapSingleTransferMigration.sol#74-90):
	External calls:
	- ISingleAssetVault(hub_.vault).startMigration(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#86)
	- _swap(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#88)
		- IERC20(hub_.asset).approve(address(_router),amountIn) (contracts/migrations/UniswapSingleTransferMigration.sol#186)
		- amountOut = _router.exactInputSingle(params) (contracts/migrations/UniswapSingleTransferMigration.sol#204)
		- meTokenRegistry.updateBalances(_meToken,amountOut) (contracts/migrations/UniswapSingleTransferMigration.sol#207)
	State variables written after the call(s):
	- _swap(_meToken) (contracts/migrations/UniswapSingleTransferMigration.sol#88)
		- usts_.swapped = true (contracts/migrations/UniswapSingleTransferMigration.sol#201)
Reentrancy in HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes) (contracts/facets/HubFacet.sol#39-85):
	External calls:
	- require(bool,string)(_vault.isValid(_asset,_encodedVaultArgs),asset !valid) (contracts/facets/HubFacet.sol#61)
	State variables written after the call(s):
	- id = ++ s.hubCount (contracts/facets/HubFacet.sol#64)
Reentrancy in HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes) (contracts/facets/HubFacet.sol#39-85):
	External calls:
	- require(bool,string)(_vault.isValid(_asset,_encodedVaultArgs),asset !valid) (contracts/facets/HubFacet.sol#61)
	- _curve.register(id,_encodedCurveDetails) (contracts/facets/HubFacet.sol#65)
	State variables written after the call(s):
	- hub_.active = true (contracts/facets/HubFacet.sol#69)
	- hub_.owner = _owner (contracts/facets/HubFacet.sol#70)
	- hub_.asset = _asset (contracts/facets/HubFacet.sol#71)
	- hub_.vault = address(_vault) (contracts/facets/HubFacet.sol#72)
	- hub_.curve = address(_curve) (contracts/facets/HubFacet.sol#73)
	- hub_.refundRatio = _refundRatio (contracts/facets/HubFacet.sol#74)
Reentrancy in MeTokenRegistryFacet.subscribe(string,string,uint256,uint256) (contracts/facets/MeTokenRegistryFacet.sol#55-114):
	External calls:
	- require(bool,string)(IERC20(hub_.asset).transferFrom(msg.sender,hub_.vault,_assetsDeposited),transfer failed) (contracts/facets/MeTokenRegistryFacet.sol#67-74)
	- meTokenAddr = IMeTokenFactory(s.meTokenFactory).create(_name,_symbol,address(this)) (contracts/facets/MeTokenRegistryFacet.sol#77-81)
	- IMeToken(meTokenAddr).mint(msg.sender,_meTokensMinted) (contracts/facets/MeTokenRegistryFacet.sol#92)
	State variables written after the call(s):
	- s.meTokenOwners[msg.sender] = meTokenAddr (contracts/facets/MeTokenRegistryFacet.sol#96)
	- meToken_.owner = msg.sender (contracts/facets/MeTokenRegistryFacet.sol#100)
	- meToken_.hubId = _hubId (contracts/facets/MeTokenRegistryFacet.sol#101)
	- meToken_.balancePooled = _assetsDeposited (contracts/facets/MeTokenRegistryFacet.sol#102)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-1

MeTokenRegistryFacet.subscribe(string,string,uint256,uint256)._meTokensMinted (contracts/facets/MeTokenRegistryFacet.sol#84) is a local variable never initialized
DiamondLoupeFacet.facets().i (contracts/facets/DiamondLoupeFacet.sol#24) is a local variable never initialized
LibDiamond.removeFunctions(address,bytes4[]).selectorIndex (contracts/libs/LibDiamond.sol#170) is a local variable never initialized
LibDiamond.replaceFunctions(address,bytes4[]).selectorIndex (contracts/libs/LibDiamond.sol#137) is a local variable never initialized
LibDiamond.diamondCut(IDiamondCut.FacetCut[],address,bytes).facetIndex (contracts/libs/LibDiamond.sol#50) is a local variable never initialized
LibDiamond.addFunctions(address,bytes4[]).selectorIndex (contracts/libs/LibDiamond.sol#99) is a local variable never initialized
HubFacet.initUpdate(uint256,address,uint256,bytes).reconfigure (contracts/facets/HubFacet.sol#130) is a local variable never initialized
Power.optimalExp(uint256).y (contracts/curves/Power.sol#469) is a local variable never initialized
Power.optimalLog(uint256).y (contracts/curves/Power.sol#387) is a local variable never initialized
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#uninitialized-local-variables

HubFacet.initUpdate(uint256,address,uint256,bytes) (contracts/facets/HubFacet.sol#98-166) ignores return value by LibHub.finishUpdate(_id) (contracts/facets/HubFacet.sol#107)
HubFacet.finishUpdate(uint256) (contracts/facets/HubFacet.sol#168-170) ignores return value by LibHub.finishUpdate(id) (contracts/facets/HubFacet.sol#169)
LibMeToken.finishResubscribe(address) (contracts/libs/LibMeToken.sol#57-82) ignores return value by IMigration(meToken_.migration).finishMigration(_meToken) (contracts/libs/LibMeToken.sol#71)
UniswapSingleTransferMigration._swap(address) (contracts/migrations/UniswapSingleTransferMigration.sol#161-208) ignores return value by IERC20(hub_.asset).approve(address(_router),amountIn) (contracts/migrations/UniswapSingleTransferMigration.sol#186)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#unused-return

MeToken.constructor(string,string,address)._name (contracts/MeToken.sol#14) shadows:
	- ERC20._name (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#42) (state variable)
MeToken.constructor(string,string,address)._symbol (contracts/MeToken.sol#15) shadows:
	- ERC20._symbol (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#43) (state variable)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#local-variable-shadowing

MeToken.constructor(string,string,address)._diamond (contracts/MeToken.sol#16) lacks a zero-check on :
		- diamond = _diamond (contracts/MeToken.sol#19)
BancorABDK.constructor(address)._hub (contracts/curves/BancorABDK.sol#32) lacks a zero-check on :
		- hub = _hub (contracts/curves/BancorABDK.sol#33)
BancorPower.constructor(address)._hub (contracts/curves/BancorPower.sol#37) lacks a zero-check on :
		- hub = _hub (contracts/curves/BancorPower.sol#38)
StepwiseCurve.constructor(address)._hub (contracts/curves/StepwiseCurve.sol#27) lacks a zero-check on :
		- hub = _hub (contracts/curves/StepwiseCurve.sol#28)
StepwiseCurveABDK.constructor(address)._hub (contracts/curves/StepwiseCurveABDK.sol#30) lacks a zero-check on :
		- hub = _hub (contracts/curves/StepwiseCurveABDK.sol#31)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-zero-address-validation

Reentrancy in Vault.handleDeposit(address,address,uint256,uint256) (contracts/vaults/Vault.sol#40-52):
	External calls:
	- IERC20(_asset).safeTransferFrom(_from,address(this),_depositAmount) (contracts/vaults/Vault.sol#47)
	State variables written after the call(s):
	- accruedFees[_asset] += _feeAmount (contracts/vaults/Vault.sol#49)
Reentrancy in Vault.handleWithdrawal(address,address,uint256,uint256) (contracts/vaults/Vault.sol#54-66):
	External calls:
	- IERC20(_asset).safeTransfer(_to,_withdrawalAmount) (contracts/vaults/Vault.sol#61)
	State variables written after the call(s):
	- accruedFees[_asset] += _feeAmount (contracts/vaults/Vault.sol#63)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-2

Reentrancy in FoundryFacet.burn(address,uint256,address) (contracts/facets/FoundryFacet.sol#135-218):
	External calls:
	- hub_ = LibHub.finishUpdate(meToken_.hubId) (contracts/facets/FoundryFacet.sol#144)
	- meToken_ = LibMeToken.finishResubscribe(_meToken) (contracts/facets/FoundryFacet.sol#149)
	- IMeToken(_meToken).burn(msg.sender,_meTokensBurned) (contracts/facets/FoundryFacet.sol#174)
	- vault.handleWithdrawal(_recipient,asset,assetsReturned,fee) (contracts/facets/FoundryFacet.sol#208)
	Event emitted after the call(s):
	- Burn(_meToken,asset,msg.sender,_recipient,_meTokensBurned,assetsReturned) (contracts/facets/FoundryFacet.sol#210-217)
Reentrancy in Vault.claim(address,bool,uint256) (contracts/vaults/Vault.sol#68-83):
	External calls:
	- IERC20(_asset).transfer(dao,_amount) (contracts/vaults/Vault.sol#81)
	Event emitted after the call(s):
	- Claim(dao,_asset,_amount) (contracts/vaults/Vault.sol#82)
Reentrancy in FoundryFacet.donate(address,uint256) (contracts/facets/FoundryFacet.sol#220-236):
	External calls:
	- vault.handleDeposit(msg.sender,asset,_assetsDeposited,0) (contracts/facets/FoundryFacet.sol#231)
	Event emitted after the call(s):
	- Donate(_meToken,asset,msg.sender,_assetsDeposited) (contracts/facets/FoundryFacet.sol#235)
Reentrancy in LibMeToken.finishResubscribe(address) (contracts/libs/LibMeToken.sol#57-82):
	External calls:
	- IMigration(meToken_.migration).finishMigration(_meToken) (contracts/libs/LibMeToken.sol#71)
	Event emitted after the call(s):
	- FinishResubscribe(_meToken) (contracts/libs/LibMeToken.sol#80)
Reentrancy in LibHub.finishUpdate(uint256) (contracts/libs/LibHub.sol#29-55):
	External calls:
	- ICurve(hub_.curve).finishReconfigure(id) (contracts/libs/LibHub.sol#40)
	Event emitted after the call(s):
	- FinishUpdate(id) (contracts/libs/LibHub.sol#53)
Reentrancy in Vault.handleDeposit(address,address,uint256,uint256) (contracts/vaults/Vault.sol#40-52):
	External calls:
	- IERC20(_asset).safeTransferFrom(_from,address(this),_depositAmount) (contracts/vaults/Vault.sol#47)
	Event emitted after the call(s):
	- HandleDeposit(_from,_asset,_depositAmount,_feeAmount) (contracts/vaults/Vault.sol#51)
Reentrancy in Vault.handleWithdrawal(address,address,uint256,uint256) (contracts/vaults/Vault.sol#54-66):
	External calls:
	- IERC20(_asset).safeTransfer(_to,_withdrawalAmount) (contracts/vaults/Vault.sol#61)
	Event emitted after the call(s):
	- HandleWithdrawal(_to,_asset,_withdrawalAmount,_feeAmount) (contracts/vaults/Vault.sol#65)
Reentrancy in MeTokenRegistryFacet.initResubscribe(address,uint256,address,bytes) (contracts/facets/MeTokenRegistryFacet.sol#116-172):
	External calls:
	- require(bool,string)(IVault(_migration).isValid(_meToken,_encodedMigrationArgs),Invalid _encodedMigrationArgs) (contracts/facets/MeTokenRegistryFacet.sol#147-150)
	- IMigration(_migration).initMigration(_meToken,_encodedMigrationArgs) (contracts/facets/MeTokenRegistryFacet.sol#164)
	Event emitted after the call(s):
	- InitResubscribe(_meToken,_targetHubId,_migration,_encodedMigrationArgs) (contracts/facets/MeTokenRegistryFacet.sol#166-171)
Reentrancy in HubFacet.initUpdate(uint256,address,uint256,bytes) (contracts/facets/HubFacet.sol#98-166):
	External calls:
	- LibHub.finishUpdate(_id) (contracts/facets/HubFacet.sol#107)
	- ICurve(hub_.curve).initReconfigure(_id,_encodedCurveDetails) (contracts/facets/HubFacet.sol#133)
	- ICurve(_targetCurve).register(_id,_encodedCurveDetails) (contracts/facets/HubFacet.sol#141)
	Event emitted after the call(s):
	- InitUpdate(_id,_targetCurve,_targetRefundRatio,_encodedCurveDetails,reconfigure,hub_.startTime,hub_.endTime,hub_.endCooldown) (contracts/facets/HubFacet.sol#156-165)
Reentrancy in FoundryFacet.mint(address,uint256,address) (contracts/facets/FoundryFacet.sol#39-100):
	External calls:
	- hub_ = LibHub.finishUpdate(meToken_.hubId) (contracts/facets/FoundryFacet.sol#49)
	- meToken_ = LibMeToken.finishResubscribe(_meToken) (contracts/facets/FoundryFacet.sol#54)
	- IMigration(meToken_.migration).poke(_meToken) (contracts/facets/FoundryFacet.sol#57)
	- vault.handleDeposit(msg.sender,asset,_assetsDeposited,fee) (contracts/facets/FoundryFacet.sol#83)
	- IMeToken(_meToken).mint(_recipient,meTokensMinted) (contracts/facets/FoundryFacet.sol#91)
	Event emitted after the call(s):
	- Mint(_meToken,asset,msg.sender,_recipient,_assetsDeposited,meTokensMinted) (contracts/facets/FoundryFacet.sol#92-99)
Reentrancy in HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes) (contracts/facets/HubFacet.sol#39-85):
	External calls:
	- require(bool,string)(_vault.isValid(_asset,_encodedVaultArgs),asset !valid) (contracts/facets/HubFacet.sol#61)
	- _curve.register(id,_encodedCurveDetails) (contracts/facets/HubFacet.sol#65)
	Event emitted after the call(s):
	- Register(id,_owner,_asset,address(_vault),address(_curve),_refundRatio,_encodedCurveDetails,_encodedVaultArgs) (contracts/facets/HubFacet.sol#75-84)
Reentrancy in SingleAssetVault.startMigration(address) (contracts/vaults/SingleAssetVault.sol#23-39):
	External calls:
	- IERC20(hub_.asset).safeTransfer(meToken_.migration,balance) (contracts/vaults/SingleAssetVault.sol#36)
	Event emitted after the call(s):
	- StartMigration(_meToken) (contracts/vaults/SingleAssetVault.sol#38)
Reentrancy in MeTokenRegistryFacet.subscribe(string,string,uint256,uint256) (contracts/facets/MeTokenRegistryFacet.sol#55-114):
	External calls:
	- require(bool,string)(IERC20(hub_.asset).transferFrom(msg.sender,hub_.vault,_assetsDeposited),transfer failed) (contracts/facets/MeTokenRegistryFacet.sol#67-74)
	- meTokenAddr = IMeTokenFactory(s.meTokenFactory).create(_name,_symbol,address(this)) (contracts/facets/MeTokenRegistryFacet.sol#77-81)
	- IMeToken(meTokenAddr).mint(msg.sender,_meTokensMinted) (contracts/facets/MeTokenRegistryFacet.sol#92)
	Event emitted after the call(s):
	- Subscribe(meTokenAddr,msg.sender,_meTokensMinted,hub_.asset,_assetsDeposited,_name,_symbol,_hubId) (contracts/facets/MeTokenRegistryFacet.sol#104-113)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#reentrancy-vulnerabilities-3

FoundryFacet.mint(address,uint256,address) (contracts/facets/FoundryFacet.sol#39-100) uses timestamp for comparisons
	Dangerous comparisons:
	- hub_.updating && block.timestamp > hub_.endTime (contracts/facets/FoundryFacet.sol#48)
	- block.timestamp > meToken_.endTime (contracts/facets/FoundryFacet.sol#51)
	- block.timestamp > meToken_.startTime (contracts/facets/FoundryFacet.sol#55)
	- meToken_.migration != address(0) && block.timestamp > meToken_.startTime (contracts/facets/FoundryFacet.sol#75-76)
FoundryFacet.burn(address,uint256,address) (contracts/facets/FoundryFacet.sol#135-218) uses timestamp for comparisons
	Dangerous comparisons:
	- hub_.updating && block.timestamp > hub_.endTime (contracts/facets/FoundryFacet.sol#143)
	- meToken_.targetHubId != 0 && block.timestamp > meToken_.endTime (contracts/facets/FoundryFacet.sol#146)
	- meToken_.migration != address(0) && block.timestamp > meToken_.startTime (contracts/facets/FoundryFacet.sol#201-202)
HubFacet.initUpdate(uint256,address,uint256,bytes) (contracts/facets/HubFacet.sol#98-166) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(msg.sender == hub_.owner,!owner) (contracts/facets/HubFacet.sol#105)
	- hub_.updating && block.timestamp > hub_.endTime (contracts/facets/HubFacet.sol#106)
	- require(bool,string)(! hub_.updating,already updating) (contracts/facets/HubFacet.sol#109)
	- require(bool,string)(block.timestamp >= hub_.endCooldown,Still cooling down) (contracts/facets/HubFacet.sol#111)
	- require(bool,string)(_targetRefundRatio != hub_.refundRatio,_targetRefundRatio == refundRatio) (contracts/facets/HubFacet.sol#123-126)
	- require(bool,string)(_targetCurve != hub_.curve,targetCurve==curve) (contracts/facets/HubFacet.sol#140)
HubFacet.cancelUpdate(uint256) (contracts/facets/HubFacet.sol#172-187) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(block.timestamp < hub_.startTime,Update has started) (contracts/facets/HubFacet.sol#176)
MeTokenRegistryFacet.subscribe(string,string,uint256,uint256) (contracts/facets/MeTokenRegistryFacet.sol#55-114) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(hub_.active,Hub inactive) (contracts/facets/MeTokenRegistryFacet.sol#63)
	- require(bool,string)(! hub_.updating,Hub updating) (contracts/facets/MeTokenRegistryFacet.sol#64)
	- require(bool,string)(IERC20(hub_.asset).transferFrom(msg.sender,hub_.vault,_assetsDeposited),transfer failed) (contracts/facets/MeTokenRegistryFacet.sol#67-74)
MeTokenRegistryFacet.initResubscribe(address,uint256,address,bytes) (contracts/facets/MeTokenRegistryFacet.sol#116-172) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(msg.sender == meToken_.owner,!owner) (contracts/facets/MeTokenRegistryFacet.sol#126)
	- require(bool,string)(block.timestamp >= meToken_.endCooldown,Cooldown not complete) (contracts/facets/MeTokenRegistryFacet.sol#127-130)
	- require(bool,string)(meToken_.hubId != _targetHubId,same hub) (contracts/facets/MeTokenRegistryFacet.sol#131)
	- require(bool,string)(targetHub_.active,targetHub inactive) (contracts/facets/MeTokenRegistryFacet.sol#132)
	- require(bool,string)(! hub_.updating,hub updating) (contracts/facets/MeTokenRegistryFacet.sol#133)
	- require(bool,string)(! targetHub_.updating,targetHub updating) (contracts/facets/MeTokenRegistryFacet.sol#134)
	- require(bool,string)(s.migrationRegistry.isApproved(hub_.vault,targetHub_.vault,_migration),!approved) (contracts/facets/MeTokenRegistryFacet.sol#139-146)
MeTokenRegistryFacet.cancelResubscribe(address) (contracts/facets/MeTokenRegistryFacet.sol#181-196) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(block.timestamp < meToken_.startTime,Resubscription has started) (contracts/facets/MeTokenRegistryFacet.sol#185-188)
MeTokenRegistryFacet.updateBalances(address,uint256) (contracts/facets/MeTokenRegistryFacet.sol#198-214) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(msg.sender == meToken_.migration,!migration) (contracts/facets/MeTokenRegistryFacet.sol#200)
MeTokenRegistryFacet.transferMeTokenOwnership(address) (contracts/facets/MeTokenRegistryFacet.sol#216-228) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(s.pendingMeTokenOwners[msg.sender] == address(0),transfer ownership already pending) (contracts/facets/MeTokenRegistryFacet.sol#217-220)
	- require(bool,string)(meToken_ != address(0),meToken does not exist) (contracts/facets/MeTokenRegistryFacet.sol#224)
MeTokenRegistryFacet.cancelTransferMeTokenOwnership() (contracts/facets/MeTokenRegistryFacet.sol#230-241) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(_meToken != address(0),meToken does not exist) (contracts/facets/MeTokenRegistryFacet.sol#232)
	- require(bool,string)(s.pendingMeTokenOwners[msg.sender] != address(0),transferMeTokenOwnership() not initiated) (contracts/facets/MeTokenRegistryFacet.sol#234-237)
MeTokenRegistryFacet.claimMeTokenOwnership(address) (contracts/facets/MeTokenRegistryFacet.sol#243-259) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(msg.sender == s.pendingMeTokenOwners[_oldOwner],!_pendingOwner) (contracts/facets/MeTokenRegistryFacet.sol#245-248)
MeTokenRegistryFacet.setMeTokenWarmup(uint256) (contracts/facets/MeTokenRegistryFacet.sol#261-268) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(_warmup != s.meTokenWarmup,same warmup) (contracts/facets/MeTokenRegistryFacet.sol#265)
	- require(bool,string)(_warmup + s.meTokenDuration < s.hubWarmup,too long) (contracts/facets/MeTokenRegistryFacet.sol#266)
MeTokenRegistryFacet.setMeTokenDuration(uint256) (contracts/facets/MeTokenRegistryFacet.sol#270-277) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(_duration != s.meTokenDuration,same duration) (contracts/facets/MeTokenRegistryFacet.sol#274)
	- require(bool,string)(s.meTokenWarmup + _duration < s.hubWarmup,too long) (contracts/facets/MeTokenRegistryFacet.sol#275)
MeTokenRegistryFacet.setMeTokenCooldown(uint256) (contracts/facets/MeTokenRegistryFacet.sol#279-285) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(_cooldown != s.meTokenCooldown,same cooldown) (contracts/facets/MeTokenRegistryFacet.sol#283)
MeTokenRegistryFacet.isOwner(address) (contracts/facets/MeTokenRegistryFacet.sol#319-321) uses timestamp for comparisons
	Dangerous comparisons:
	- s.meTokenOwners[_owner] != address(0) (contracts/facets/MeTokenRegistryFacet.sol#320)
LibHub.finishUpdate(uint256) (contracts/libs/LibHub.sol#29-55) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(block.timestamp > hub_.endTime,Still updating) (contracts/libs/LibHub.sol#32)
LibMeToken.finishResubscribe(address) (contracts/libs/LibMeToken.sol#57-82) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(block.timestamp > meToken_.endTime,block.timestamp < endTime) (contracts/libs/LibMeToken.sol#65-68)
LibWeightedAverage.calculate(uint256,uint256,uint256,uint256) (contracts/libs/LibWeightedAverage.sol#21-55) uses timestamp for comparisons
	Dangerous comparisons:
	- block.timestamp < startTime (contracts/libs/LibWeightedAverage.sol#27)
	- block.timestamp > endTime (contracts/libs/LibWeightedAverage.sol#30)
WeightedAverage.calculate(uint256,uint256,uint256,uint256) (contracts/libs/WeightedAverage.sol#19-53) uses timestamp for comparisons
	Dangerous comparisons:
	- block.timestamp < startTime (contracts/libs/WeightedAverage.sol#25)
	- block.timestamp > endTime (contracts/libs/WeightedAverage.sol#28)
UniswapSingleTransferMigration.poke(address) (contracts/migrations/UniswapSingleTransferMigration.sol#74-90) uses timestamp for comparisons
	Dangerous comparisons:
	- usts_.soonest != 0 && block.timestamp > usts_.soonest && ! usts_.started (contracts/migrations/UniswapSingleTransferMigration.sol#82-84)
UniswapSingleTransferMigration.finishMigration(address) (contracts/migrations/UniswapSingleTransferMigration.sol#92-123) uses timestamp for comparisons
	Dangerous comparisons:
	- require(bool,string)(usts_.soonest < block.timestamp,timestamp < soonest) (contracts/migrations/UniswapSingleTransferMigration.sol#100)
UniswapSingleTransferMigration.isValid(address,bytes) (contracts/migrations/UniswapSingleTransferMigration.sol#134-159) uses timestamp for comparisons
	Dangerous comparisons:
	- soon < block.timestamp (contracts/migrations/UniswapSingleTransferMigration.sol#147)
UniswapSingleTransferMigration._swap(address) (contracts/migrations/UniswapSingleTransferMigration.sol#161-208) uses timestamp for comparisons
	Dangerous comparisons:
	- amountIn == 0 || ! usts_.started || usts_.swapped || usts_.soonest == 0 || usts_.soonest > block.timestamp (contracts/migrations/UniswapSingleTransferMigration.sol#176-180)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#block-timestamp

Address.verifyCallResult(bool,bytes,string) (node_modules/@openzeppelin/contracts/utils/Address.sol#201-221) uses assembly
	- INLINE ASM (node_modules/@openzeppelin/contracts/utils/Address.sol#213-216)
Diamond.fallback() (contracts/Diamond.sol#36-63) uses assembly
	- INLINE ASM (contracts/Diamond.sol#40-42)
	- INLINE ASM (contracts/Diamond.sol#47-62)
LibAppStorage.diamondStorage() (contracts/libs/Details.sol#53-57) uses assembly
	- INLINE ASM (contracts/libs/Details.sol#54-56)
LibDiamond.enforceHasContractCode(address,string) (contracts/libs/LibDiamond.sol#302-311) uses assembly
	- INLINE ASM (contracts/libs/LibDiamond.sol#307-309)
LibDiamond.diamondStorage() (contracts/libs/LibDiamond.sol#313-322) uses assembly
	- INLINE ASM (contracts/libs/LibDiamond.sol#319-321)
LibMeta.getChainID() (contracts/libs/LibMeta.sol#28-32) uses assembly
	- INLINE ASM (contracts/libs/LibMeta.sol#29-31)
LibMeta.msgSender() (contracts/libs/LibMeta.sol#34-48) uses assembly
	- INLINE ASM (contracts/libs/LibMeta.sol#38-44)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#assembly-usage

Different versions of Solidity is used:
	- Version used: ['>=0.5.0', '>=0.7.5', '^0.8', '^0.8.0', '^0.8.1']
	- ^0.8.0 (node_modules/@openzeppelin/contracts/access/Ownable.sol#4)
	- ^0.8.0 (node_modules/@openzeppelin/contracts/proxy/utils/Initializable.sol#4)
	- ^0.8.0 (node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol#4)
	- ^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#4)
	- ^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol#4)
	- ^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol#4)
	- ^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol#4)
	- ^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol#4)
	- ^0.8.1 (node_modules/@openzeppelin/contracts/utils/Address.sol#4)
	- ^0.8.0 (node_modules/@openzeppelin/contracts/utils/Context.sol#4)
	- ^0.8.0 (node_modules/@openzeppelin/contracts/utils/introspection/IERC165.sol#4)
	- >=0.5.0 (node_modules/@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol#2)
	- >=0.7.5 (node_modules/@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol#2)
	- v2 (node_modules/@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol#3)
	- ^0.8.0 (contracts/Diamond.sol#2)
	- ^0.8.0 (contracts/DiamondInit.sol#2)
	- ^0.8.0 (contracts/MeToken.sol#2)
	- ^0.8.0 (contracts/MeTokenFactory.sol#2)
	- ^0.8.0 (contracts/curves/BancorABDK.sol#2)
	- ^0.8 (contracts/curves/BancorPower.sol#2)
	- ^0.8 (contracts/curves/Power.sol#2)
	- ^0.8.0 (contracts/curves/StepwiseCurve.sol#2)
	- ^0.8.0 (contracts/curves/StepwiseCurveABDK.sol#2)
	- ^0.8.0 (contracts/facets/DiamondCutFacet.sol#2)
	- ^0.8.0 (contracts/facets/DiamondLoupeFacet.sol#2)
	- ^0.8.0 (contracts/facets/FeesFacet.sol#2)
	- ^0.8.0 (contracts/facets/FoundryFacet.sol#3)
	- ^0.8.0 (contracts/facets/HubFacet.sol#2)
	- ^0.8.0 (contracts/facets/MeTokenRegistryFacet.sol#2)
	- ^0.8.0 (contracts/facets/OwnershipFacet.sol#2)
	- ^0.8.0 (contracts/interfaces/ICurve.sol#2)
	- ^0.8.0 (contracts/interfaces/IDiamondCut.sol#2)
	- ^0.8.0 (contracts/interfaces/IDiamondLoupe.sol#2)
	- ^0.8.0 (contracts/interfaces/IERC173.sol#2)
	- ^0.8.0 (contracts/interfaces/IFoundry.sol#2)
	- ^0.8.0 (contracts/interfaces/IHub.sol#2)
	- ^0.8.0 (contracts/interfaces/IMeToken.sol#2)
	- ^0.8.0 (contracts/interfaces/IMeTokenFactory.sol#2)
	- ^0.8.0 (contracts/interfaces/IMeTokenRegistry.sol#2)
	- ^0.8.0 (contracts/interfaces/IMigration.sol#2)
	- ^0.8.0 (contracts/interfaces/IMigrationRegistry.sol#2)
	- ^0.8.0 (contracts/interfaces/IRegistry.sol#2)
	- ^0.8.0 (contracts/interfaces/ISingleAssetVault.sol#2)
	- ^0.8.0 (contracts/interfaces/IVault.sol#2)
	- ^0.8.0 (contracts/libs/Details.sol#2)
	- ^0.8.0 (contracts/libs/LibDiamond.sol#2)
	- ^0.8.0 (contracts/libs/LibHub.sol#2)
	- ^0.8.0 (contracts/libs/LibMeToken.sol#2)
	- ^0.8.0 (contracts/libs/LibMeta.sol#2)
	- ^0.8.0 (contracts/libs/LibWeightedAverage.sol#2)
	- ^0.8.0 (contracts/libs/WeightedAverage.sol#2)
	- ^0.8.0 (contracts/migrations/SameAssetTransferMigration.sol#2)
	- ^0.8.0 (contracts/migrations/UniswapSingleTransferMigration.sol#2)
	- ^0.8.0 (contracts/registries/CurveRegistry.sol#2)
	- ^0.8.0 (contracts/registries/MigrationRegistry.sol#2)
	- ^0.8.0 (contracts/registries/Registry.sol#2)
	- ^0.8.0 (contracts/registries/VaultRegistry.sol#2)
	- ^0.8.0 (contracts/utils/ABDKMathQuad.sol#6)
	- ^0.8.0 (contracts/vaults/SingleAssetVault.sol#2)
	- ^0.8.0 (contracts/vaults/Vault.sol#2)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#different-pragma-directives-are-used

LibHub.count() (contracts/libs/LibHub.sol#74-77) is never used and should be removed
LibMeta.domainSeparator(string,string) (contracts/libs/LibMeta.sol#12-26) is never used and should be removed
LibMeta.getChainID() (contracts/libs/LibMeta.sol#28-32) is never used and should be removed
LibMeta.msgSender() (contracts/libs/LibMeta.sol#34-48) is never used and should be removed
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#dead-code

Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/access/Ownable.sol#4) allows old versions
Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/proxy/utils/Initializable.sol#4) allows old versions
Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol#4) allows old versions
Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#4) allows old versions
Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol#4) allows old versions
Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol#4) allows old versions
Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol#4) allows old versions
Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol#4) allows old versions
Pragma version^0.8.1 (node_modules/@openzeppelin/contracts/utils/Address.sol#4) allows old versions
Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/utils/Context.sol#4) allows old versions
Pragma version^0.8.0 (node_modules/@openzeppelin/contracts/utils/introspection/IERC165.sol#4) allows old versions
Pragma version>=0.5.0 (node_modules/@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol#2) allows old versions
Pragma version^0.8.0 (contracts/Diamond.sol#2) allows old versions
Pragma version^0.8.0 (contracts/DiamondInit.sol#2) allows old versions
Pragma version^0.8.0 (contracts/MeToken.sol#2) allows old versions
Pragma version^0.8.0 (contracts/MeTokenFactory.sol#2) allows old versions
Pragma version^0.8.0 (contracts/curves/BancorABDK.sol#2) allows old versions
Pragma version^0.8 (contracts/curves/BancorPower.sol#2) is too complex
Pragma version^0.8 (contracts/curves/Power.sol#2) is too complex
Pragma version^0.8.0 (contracts/curves/StepwiseCurve.sol#2) allows old versions
Pragma version^0.8.0 (contracts/curves/StepwiseCurveABDK.sol#2) allows old versions
Pragma version^0.8.0 (contracts/facets/DiamondCutFacet.sol#2) allows old versions
Pragma version^0.8.0 (contracts/facets/DiamondLoupeFacet.sol#2) allows old versions
Pragma version^0.8.0 (contracts/facets/FeesFacet.sol#2) allows old versions
Pragma version^0.8.0 (contracts/facets/FoundryFacet.sol#3) allows old versions
Pragma version^0.8.0 (contracts/facets/HubFacet.sol#2) allows old versions
Pragma version^0.8.0 (contracts/facets/MeTokenRegistryFacet.sol#2) allows old versions
Pragma version^0.8.0 (contracts/facets/OwnershipFacet.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/ICurve.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IDiamondCut.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IDiamondLoupe.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IERC173.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IFoundry.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IHub.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IMeToken.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IMeTokenFactory.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IMeTokenRegistry.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IMigration.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IMigrationRegistry.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IRegistry.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/ISingleAssetVault.sol#2) allows old versions
Pragma version^0.8.0 (contracts/interfaces/IVault.sol#2) allows old versions
Pragma version^0.8.0 (contracts/libs/Details.sol#2) allows old versions
Pragma version^0.8.0 (contracts/libs/LibDiamond.sol#2) allows old versions
Pragma version^0.8.0 (contracts/libs/LibHub.sol#2) allows old versions
Pragma version^0.8.0 (contracts/libs/LibMeToken.sol#2) allows old versions
Pragma version^0.8.0 (contracts/libs/LibMeta.sol#2) allows old versions
Pragma version^0.8.0 (contracts/libs/LibWeightedAverage.sol#2) allows old versions
Pragma version^0.8.0 (contracts/libs/WeightedAverage.sol#2) allows old versions
Pragma version^0.8.0 (contracts/migrations/SameAssetTransferMigration.sol#2) allows old versions
Pragma version^0.8.0 (contracts/migrations/UniswapSingleTransferMigration.sol#2) allows old versions
Pragma version^0.8.0 (contracts/registries/CurveRegistry.sol#2) allows old versions
Pragma version^0.8.0 (contracts/registries/MigrationRegistry.sol#2) allows old versions
Pragma version^0.8.0 (contracts/registries/Registry.sol#2) allows old versions
Pragma version^0.8.0 (contracts/registries/VaultRegistry.sol#2) allows old versions
Pragma version^0.8.0 (contracts/utils/ABDKMathQuad.sol#6) allows old versions
Pragma version^0.8.0 (contracts/vaults/SingleAssetVault.sol#2) allows old versions
Pragma version^0.8.0 (contracts/vaults/Vault.sol#2) allows old versions
solc-0.8.10 is not recommended for deployment
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-versions-of-solidity

Pragma version^0.8.0 (contracts/interfaces/IFees.sol#2) allows old versions
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#incorrect-versions-of-solidity

Low level call in Address.sendValue(address,uint256) (node_modules/@openzeppelin/contracts/utils/Address.sol#60-65):
	- (success) = recipient.call{value: amount}() (node_modules/@openzeppelin/contracts/utils/Address.sol#63)
Low level call in Address.functionCallWithValue(address,bytes,uint256,string) (node_modules/@openzeppelin/contracts/utils/Address.sol#128-139):
	- (success,returndata) = target.call{value: value}(data) (node_modules/@openzeppelin/contracts/utils/Address.sol#137)
Low level call in Address.functionStaticCall(address,bytes,string) (node_modules/@openzeppelin/contracts/utils/Address.sol#157-166):
	- (success,returndata) = target.staticcall(data) (node_modules/@openzeppelin/contracts/utils/Address.sol#164)
Low level call in Address.functionDelegateCall(address,bytes,string) (node_modules/@openzeppelin/contracts/utils/Address.sol#184-193):
	- (success,returndata) = target.delegatecall(data) (node_modules/@openzeppelin/contracts/utils/Address.sol#191)
Low level call in LibDiamond.initializeDiamondCut(address,bytes) (contracts/libs/LibDiamond.sol#271-300):
	- (success,error) = _init.delegatecall(_calldata) (contracts/libs/LibDiamond.sol#290)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#low-level-calls

MigrationRegistry (contracts/registries/MigrationRegistry.sol#9-45) should inherit from IMigrationRegistry (contracts/interfaces/IMigrationRegistry.sol#6-57)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#missing-inheritance

Parameter DiamondInit.init(DiamondInit.Args)._args (contracts/DiamondInit.sol#31) is not in mixedCase
Parameter MeTokenFactory.create(string,string,address)._name (contracts/MeTokenFactory.sol#15) is not in mixedCase
Parameter MeTokenFactory.create(string,string,address)._symbol (contracts/MeTokenFactory.sol#16) is not in mixedCase
Parameter MeTokenFactory.create(string,string,address)._diamond (contracts/MeTokenFactory.sol#17) is not in mixedCase
Parameter BancorABDK.register(uint256,bytes)._hubId (contracts/curves/BancorABDK.sol#36) is not in mixedCase
Parameter BancorABDK.register(uint256,bytes)._encodedDetails (contracts/curves/BancorABDK.sol#36) is not in mixedCase
Parameter BancorABDK.initReconfigure(uint256,bytes)._hubId (contracts/curves/BancorABDK.sol#58) is not in mixedCase
Parameter BancorABDK.initReconfigure(uint256,bytes)._encodedDetails (contracts/curves/BancorABDK.sol#58) is not in mixedCase
Parameter BancorABDK.finishReconfigure(uint256)._hubId (contracts/curves/BancorABDK.sol#80) is not in mixedCase
Parameter BancorABDK.viewMeTokensMinted(uint256,uint256,uint256,uint256)._assetsDeposited (contracts/curves/BancorABDK.sol#113) is not in mixedCase
Parameter BancorABDK.viewMeTokensMinted(uint256,uint256,uint256,uint256)._hubId (contracts/curves/BancorABDK.sol#114) is not in mixedCase
Parameter BancorABDK.viewMeTokensMinted(uint256,uint256,uint256,uint256)._supply (contracts/curves/BancorABDK.sol#115) is not in mixedCase
Parameter BancorABDK.viewMeTokensMinted(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/BancorABDK.sol#116) is not in mixedCase
Parameter BancorABDK.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._assetsDeposited (contracts/curves/BancorABDK.sol#138) is not in mixedCase
Parameter BancorABDK.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._hubId (contracts/curves/BancorABDK.sol#139) is not in mixedCase
Parameter BancorABDK.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._supply (contracts/curves/BancorABDK.sol#140) is not in mixedCase
Parameter BancorABDK.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/BancorABDK.sol#141) is not in mixedCase
Parameter BancorABDK.viewAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/BancorABDK.sol#162) is not in mixedCase
Parameter BancorABDK.viewAssetsReturned(uint256,uint256,uint256,uint256)._hubId (contracts/curves/BancorABDK.sol#163) is not in mixedCase
Parameter BancorABDK.viewAssetsReturned(uint256,uint256,uint256,uint256)._supply (contracts/curves/BancorABDK.sol#164) is not in mixedCase
Parameter BancorABDK.viewAssetsReturned(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/BancorABDK.sol#165) is not in mixedCase
Parameter BancorABDK.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/BancorABDK.sol#177) is not in mixedCase
Parameter BancorABDK.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._hubId (contracts/curves/BancorABDK.sol#178) is not in mixedCase
Parameter BancorABDK.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._supply (contracts/curves/BancorABDK.sol#179) is not in mixedCase
Parameter BancorABDK.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/BancorABDK.sol#180) is not in mixedCase
Parameter BancorPower.register(uint256,bytes)._hubId (contracts/curves/BancorPower.sol#41) is not in mixedCase
Parameter BancorPower.register(uint256,bytes)._encodedDetails (contracts/curves/BancorPower.sol#41) is not in mixedCase
Parameter BancorPower.initReconfigure(uint256,bytes)._hubId (contracts/curves/BancorPower.sol#63) is not in mixedCase
Parameter BancorPower.initReconfigure(uint256,bytes)._encodedDetails (contracts/curves/BancorPower.sol#63) is not in mixedCase
Parameter BancorPower.finishReconfigure(uint256)._hubId (contracts/curves/BancorPower.sol#86) is not in mixedCase
Parameter BancorPower.viewMeTokensMinted(uint256,uint256,uint256,uint256)._assetsDeposited (contracts/curves/BancorPower.sol#118) is not in mixedCase
Parameter BancorPower.viewMeTokensMinted(uint256,uint256,uint256,uint256)._hubId (contracts/curves/BancorPower.sol#119) is not in mixedCase
Parameter BancorPower.viewMeTokensMinted(uint256,uint256,uint256,uint256)._supply (contracts/curves/BancorPower.sol#120) is not in mixedCase
Parameter BancorPower.viewMeTokensMinted(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/BancorPower.sol#121) is not in mixedCase
Parameter BancorPower.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._assetsDeposited (contracts/curves/BancorPower.sol#141) is not in mixedCase
Parameter BancorPower.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._hubId (contracts/curves/BancorPower.sol#142) is not in mixedCase
Parameter BancorPower.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._supply (contracts/curves/BancorPower.sol#143) is not in mixedCase
Parameter BancorPower.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/BancorPower.sol#144) is not in mixedCase
Parameter BancorPower.viewAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/BancorPower.sol#164) is not in mixedCase
Parameter BancorPower.viewAssetsReturned(uint256,uint256,uint256,uint256)._hubId (contracts/curves/BancorPower.sol#165) is not in mixedCase
Parameter BancorPower.viewAssetsReturned(uint256,uint256,uint256,uint256)._supply (contracts/curves/BancorPower.sol#166) is not in mixedCase
Parameter BancorPower.viewAssetsReturned(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/BancorPower.sol#167) is not in mixedCase
Parameter BancorPower.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/BancorPower.sol#179) is not in mixedCase
Parameter BancorPower.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._hubId (contracts/curves/BancorPower.sol#180) is not in mixedCase
Parameter BancorPower.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._supply (contracts/curves/BancorPower.sol#181) is not in mixedCase
Parameter BancorPower.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/BancorPower.sol#182) is not in mixedCase
Parameter Power.power(uint256,uint256,uint32,uint32)._baseN (contracts/curves/Power.sol#182) is not in mixedCase
Parameter Power.power(uint256,uint256,uint32,uint32)._baseD (contracts/curves/Power.sol#183) is not in mixedCase
Parameter Power.power(uint256,uint256,uint32,uint32)._expN (contracts/curves/Power.sol#184) is not in mixedCase
Parameter Power.power(uint256,uint256,uint32,uint32)._expD (contracts/curves/Power.sol#185) is not in mixedCase
Parameter Power.generalLog(uint256)._x (contracts/curves/Power.sol#217) is not in mixedCase
Parameter Power.floorLog2(uint256)._n (contracts/curves/Power.sol#245) is not in mixedCase
Parameter Power.findPositionInMaxExpArray(uint256)._x (contracts/curves/Power.sol#273) is not in mixedCase
Parameter Power.generalExp(uint256,uint8)._x (contracts/curves/Power.sol#302) is not in mixedCase
Parameter Power.generalExp(uint256,uint8)._precision (contracts/curves/Power.sol#302) is not in mixedCase
Parameter StepwiseCurve.register(uint256,bytes)._hubId (contracts/curves/StepwiseCurve.sol#31) is not in mixedCase
Parameter StepwiseCurve.register(uint256,bytes)._encodedDetails (contracts/curves/StepwiseCurve.sol#31) is not in mixedCase
Parameter StepwiseCurve.initReconfigure(uint256,bytes)._hubId (contracts/curves/StepwiseCurve.sol#49) is not in mixedCase
Parameter StepwiseCurve.initReconfigure(uint256,bytes)._encodedDetails (contracts/curves/StepwiseCurve.sol#49) is not in mixedCase
Parameter StepwiseCurve.finishReconfigure(uint256)._hubId (contracts/curves/StepwiseCurve.sol#80) is not in mixedCase
Parameter StepwiseCurve.viewMeTokensMinted(uint256,uint256,uint256,uint256)._assetsDeposited (contracts/curves/StepwiseCurve.sol#112) is not in mixedCase
Parameter StepwiseCurve.viewMeTokensMinted(uint256,uint256,uint256,uint256)._hubId (contracts/curves/StepwiseCurve.sol#113) is not in mixedCase
Parameter StepwiseCurve.viewMeTokensMinted(uint256,uint256,uint256,uint256)._supply (contracts/curves/StepwiseCurve.sol#114) is not in mixedCase
Parameter StepwiseCurve.viewMeTokensMinted(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/StepwiseCurve.sol#115) is not in mixedCase
Parameter StepwiseCurve.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._assetsDeposited (contracts/curves/StepwiseCurve.sol#128) is not in mixedCase
Parameter StepwiseCurve.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._hubId (contracts/curves/StepwiseCurve.sol#129) is not in mixedCase
Parameter StepwiseCurve.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._supply (contracts/curves/StepwiseCurve.sol#130) is not in mixedCase
Parameter StepwiseCurve.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/StepwiseCurve.sol#131) is not in mixedCase
Parameter StepwiseCurve.viewAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/StepwiseCurve.sol#144) is not in mixedCase
Parameter StepwiseCurve.viewAssetsReturned(uint256,uint256,uint256,uint256)._hubId (contracts/curves/StepwiseCurve.sol#145) is not in mixedCase
Parameter StepwiseCurve.viewAssetsReturned(uint256,uint256,uint256,uint256)._supply (contracts/curves/StepwiseCurve.sol#146) is not in mixedCase
Parameter StepwiseCurve.viewAssetsReturned(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/StepwiseCurve.sol#147) is not in mixedCase
Parameter StepwiseCurve.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/StepwiseCurve.sol#160) is not in mixedCase
Parameter StepwiseCurve.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._hubId (contracts/curves/StepwiseCurve.sol#161) is not in mixedCase
Parameter StepwiseCurve.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._supply (contracts/curves/StepwiseCurve.sol#162) is not in mixedCase
Parameter StepwiseCurve.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/StepwiseCurve.sol#163) is not in mixedCase
Parameter StepwiseCurveABDK.register(uint256,bytes)._hubId (contracts/curves/StepwiseCurveABDK.sol#34) is not in mixedCase
Parameter StepwiseCurveABDK.register(uint256,bytes)._encodedDetails (contracts/curves/StepwiseCurveABDK.sol#34) is not in mixedCase
Parameter StepwiseCurveABDK.initReconfigure(uint256,bytes)._hubId (contracts/curves/StepwiseCurveABDK.sol#53) is not in mixedCase
Parameter StepwiseCurveABDK.initReconfigure(uint256,bytes)._encodedDetails (contracts/curves/StepwiseCurveABDK.sol#53) is not in mixedCase
Parameter StepwiseCurveABDK.finishReconfigure(uint256)._hubId (contracts/curves/StepwiseCurveABDK.sol#77) is not in mixedCase
Parameter StepwiseCurveABDK.viewMeTokensMinted(uint256,uint256,uint256,uint256)._assetsDeposited (contracts/curves/StepwiseCurveABDK.sol#109) is not in mixedCase
Parameter StepwiseCurveABDK.viewMeTokensMinted(uint256,uint256,uint256,uint256)._hubId (contracts/curves/StepwiseCurveABDK.sol#110) is not in mixedCase
Parameter StepwiseCurveABDK.viewMeTokensMinted(uint256,uint256,uint256,uint256)._supply (contracts/curves/StepwiseCurveABDK.sol#111) is not in mixedCase
Parameter StepwiseCurveABDK.viewMeTokensMinted(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/StepwiseCurveABDK.sol#112) is not in mixedCase
Parameter StepwiseCurveABDK.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._assetsDeposited (contracts/curves/StepwiseCurveABDK.sol#125) is not in mixedCase
Parameter StepwiseCurveABDK.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._hubId (contracts/curves/StepwiseCurveABDK.sol#126) is not in mixedCase
Parameter StepwiseCurveABDK.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._supply (contracts/curves/StepwiseCurveABDK.sol#127) is not in mixedCase
Parameter StepwiseCurveABDK.viewTargetMeTokensMinted(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/StepwiseCurveABDK.sol#128) is not in mixedCase
Parameter StepwiseCurveABDK.viewAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/StepwiseCurveABDK.sol#141) is not in mixedCase
Parameter StepwiseCurveABDK.viewAssetsReturned(uint256,uint256,uint256,uint256)._hubId (contracts/curves/StepwiseCurveABDK.sol#142) is not in mixedCase
Parameter StepwiseCurveABDK.viewAssetsReturned(uint256,uint256,uint256,uint256)._supply (contracts/curves/StepwiseCurveABDK.sol#143) is not in mixedCase
Parameter StepwiseCurveABDK.viewAssetsReturned(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/StepwiseCurveABDK.sol#144) is not in mixedCase
Parameter StepwiseCurveABDK.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/StepwiseCurveABDK.sol#157) is not in mixedCase
Parameter StepwiseCurveABDK.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._hubId (contracts/curves/StepwiseCurveABDK.sol#158) is not in mixedCase
Parameter StepwiseCurveABDK.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._supply (contracts/curves/StepwiseCurveABDK.sol#159) is not in mixedCase
Parameter StepwiseCurveABDK.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._balancePooled (contracts/curves/StepwiseCurveABDK.sol#160) is not in mixedCase
Parameter DiamondCutFacet.diamondCut(IDiamondCut.FacetCut[],address,bytes)._diamondCut (contracts/facets/DiamondCutFacet.sol#21) is not in mixedCase
Parameter DiamondCutFacet.diamondCut(IDiamondCut.FacetCut[],address,bytes)._init (contracts/facets/DiamondCutFacet.sol#22) is not in mixedCase
Parameter DiamondCutFacet.diamondCut(IDiamondCut.FacetCut[],address,bytes)._calldata (contracts/facets/DiamondCutFacet.sol#23) is not in mixedCase
Parameter DiamondLoupeFacet.facetFunctionSelectors(address)._facet (contracts/facets/DiamondLoupeFacet.sol#36) is not in mixedCase
Parameter DiamondLoupeFacet.facetAddress(bytes4)._functionSelector (contracts/facets/DiamondLoupeFacet.sol#64) is not in mixedCase
Parameter DiamondLoupeFacet.supportsInterface(bytes4)._interfaceId (contracts/facets/DiamondLoupeFacet.sol#77) is not in mixedCase
Parameter FoundryFacet.mint(address,uint256,address)._meToken (contracts/facets/FoundryFacet.sol#40) is not in mixedCase
Parameter FoundryFacet.mint(address,uint256,address)._assetsDeposited (contracts/facets/FoundryFacet.sol#41) is not in mixedCase
Parameter FoundryFacet.mint(address,uint256,address)._recipient (contracts/facets/FoundryFacet.sol#42) is not in mixedCase
Parameter FoundryFacet.burn(address,uint256,address)._meToken (contracts/facets/FoundryFacet.sol#136) is not in mixedCase
Parameter FoundryFacet.burn(address,uint256,address)._meTokensBurned (contracts/facets/FoundryFacet.sol#137) is not in mixedCase
Parameter FoundryFacet.burn(address,uint256,address)._recipient (contracts/facets/FoundryFacet.sol#138) is not in mixedCase
Parameter FoundryFacet.donate(address,uint256)._meToken (contracts/facets/FoundryFacet.sol#220) is not in mixedCase
Parameter FoundryFacet.donate(address,uint256)._assetsDeposited (contracts/facets/FoundryFacet.sol#220) is not in mixedCase
Parameter HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes)._owner (contracts/facets/HubFacet.sol#40) is not in mixedCase
Parameter HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes)._asset (contracts/facets/HubFacet.sol#41) is not in mixedCase
Parameter HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes)._vault (contracts/facets/HubFacet.sol#42) is not in mixedCase
Parameter HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes)._curve (contracts/facets/HubFacet.sol#43) is not in mixedCase
Parameter HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes)._refundRatio (contracts/facets/HubFacet.sol#44) is not in mixedCase
Parameter HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes)._encodedCurveDetails (contracts/facets/HubFacet.sol#45) is not in mixedCase
Parameter HubFacet.register(address,address,IVault,ICurve,uint256,bytes,bytes)._encodedVaultArgs (contracts/facets/HubFacet.sol#46) is not in mixedCase
Parameter HubFacet.deactivate(uint256)._id (contracts/facets/HubFacet.sol#87) is not in mixedCase
Parameter HubFacet.initUpdate(uint256,address,uint256,bytes)._id (contracts/facets/HubFacet.sol#99) is not in mixedCase
Parameter HubFacet.initUpdate(uint256,address,uint256,bytes)._targetCurve (contracts/facets/HubFacet.sol#100) is not in mixedCase
Parameter HubFacet.initUpdate(uint256,address,uint256,bytes)._targetRefundRatio (contracts/facets/HubFacet.sol#101) is not in mixedCase
Parameter HubFacet.initUpdate(uint256,address,uint256,bytes)._encodedCurveDetails (contracts/facets/HubFacet.sol#102) is not in mixedCase
Parameter HubFacet.cancelUpdate(uint256)._id (contracts/facets/HubFacet.sol#172) is not in mixedCase
Parameter HubFacet.transferHubOwnership(uint256,address)._id (contracts/facets/HubFacet.sol#189) is not in mixedCase
Parameter HubFacet.transferHubOwnership(uint256,address)._newOwner (contracts/facets/HubFacet.sol#189) is not in mixedCase
Parameter HubFacet.setHubWarmup(uint256)._warmup (contracts/facets/HubFacet.sol#198) is not in mixedCase
Parameter HubFacet.setHubDuration(uint256)._duration (contracts/facets/HubFacet.sol#203) is not in mixedCase
Parameter HubFacet.setHubCooldown(uint256)._cooldown (contracts/facets/HubFacet.sol#211) is not in mixedCase
Parameter HubFacet.getHubDetails(uint256)._id (contracts/facets/HubFacet.sol#219) is not in mixedCase
Parameter MeTokenRegistryFacet.subscribe(string,string,uint256,uint256)._name (contracts/facets/MeTokenRegistryFacet.sol#56) is not in mixedCase
Parameter MeTokenRegistryFacet.subscribe(string,string,uint256,uint256)._symbol (contracts/facets/MeTokenRegistryFacet.sol#57) is not in mixedCase
Parameter MeTokenRegistryFacet.subscribe(string,string,uint256,uint256)._hubId (contracts/facets/MeTokenRegistryFacet.sol#58) is not in mixedCase
Parameter MeTokenRegistryFacet.subscribe(string,string,uint256,uint256)._assetsDeposited (contracts/facets/MeTokenRegistryFacet.sol#59) is not in mixedCase
Parameter MeTokenRegistryFacet.initResubscribe(address,uint256,address,bytes)._meToken (contracts/facets/MeTokenRegistryFacet.sol#117) is not in mixedCase
Parameter MeTokenRegistryFacet.initResubscribe(address,uint256,address,bytes)._targetHubId (contracts/facets/MeTokenRegistryFacet.sol#118) is not in mixedCase
Parameter MeTokenRegistryFacet.initResubscribe(address,uint256,address,bytes)._migration (contracts/facets/MeTokenRegistryFacet.sol#119) is not in mixedCase
Parameter MeTokenRegistryFacet.initResubscribe(address,uint256,address,bytes)._encodedMigrationArgs (contracts/facets/MeTokenRegistryFacet.sol#120) is not in mixedCase
Parameter MeTokenRegistryFacet.finishResubscribe(address)._meToken (contracts/facets/MeTokenRegistryFacet.sol#174) is not in mixedCase
Parameter MeTokenRegistryFacet.cancelResubscribe(address)._meToken (contracts/facets/MeTokenRegistryFacet.sol#181) is not in mixedCase
Parameter MeTokenRegistryFacet.updateBalances(address,uint256)._meToken (contracts/facets/MeTokenRegistryFacet.sol#198) is not in mixedCase
Parameter MeTokenRegistryFacet.updateBalances(address,uint256)._newBalance (contracts/facets/MeTokenRegistryFacet.sol#198) is not in mixedCase
Parameter MeTokenRegistryFacet.transferMeTokenOwnership(address)._newOwner (contracts/facets/MeTokenRegistryFacet.sol#216) is not in mixedCase
Parameter MeTokenRegistryFacet.claimMeTokenOwnership(address)._oldOwner (contracts/facets/MeTokenRegistryFacet.sol#243) is not in mixedCase
Parameter MeTokenRegistryFacet.setMeTokenWarmup(uint256)._warmup (contracts/facets/MeTokenRegistryFacet.sol#261) is not in mixedCase
Parameter MeTokenRegistryFacet.setMeTokenDuration(uint256)._duration (contracts/facets/MeTokenRegistryFacet.sol#270) is not in mixedCase
Parameter MeTokenRegistryFacet.setMeTokenCooldown(uint256)._cooldown (contracts/facets/MeTokenRegistryFacet.sol#279) is not in mixedCase
Parameter MeTokenRegistryFacet.getOwnerMeToken(address)._owner (contracts/facets/MeTokenRegistryFacet.sol#299) is not in mixedCase
Parameter MeTokenRegistryFacet.getPendingOwner(address)._oldOwner (contracts/facets/MeTokenRegistryFacet.sol#303) is not in mixedCase
Parameter MeTokenRegistryFacet.getMeTokenDetails(address)._meToken (contracts/facets/MeTokenRegistryFacet.sol#311) is not in mixedCase
Parameter MeTokenRegistryFacet.isOwner(address)._owner (contracts/facets/MeTokenRegistryFacet.sol#319) is not in mixedCase
Parameter OwnershipFacet.setDiamondController(address)._newController (contracts/facets/OwnershipFacet.sol#10) is not in mixedCase
Parameter OwnershipFacet.setFeesController(address)._newController (contracts/facets/OwnershipFacet.sol#21) is not in mixedCase
Parameter OwnershipFacet.setDurationsController(address)._newController (contracts/facets/OwnershipFacet.sol#32) is not in mixedCase
Parameter OwnershipFacet.setMeTokenRegistryController(address)._newController (contracts/facets/OwnershipFacet.sol#43) is not in mixedCase
Parameter OwnershipFacet.setRegisterController(address)._newController (contracts/facets/OwnershipFacet.sol#54) is not in mixedCase
Parameter OwnershipFacet.setDeactivateController(address)._newController (contracts/facets/OwnershipFacet.sol#65) is not in mixedCase
Parameter LibAppStorage.initControllers(address)._firstController (contracts/libs/Details.sol#59) is not in mixedCase
Parameter LibDiamond.diamondCut(IDiamondCut.FacetCut[],address,bytes)._diamondCut (contracts/libs/LibDiamond.sol#45) is not in mixedCase
Parameter LibDiamond.diamondCut(IDiamondCut.FacetCut[],address,bytes)._init (contracts/libs/LibDiamond.sol#46) is not in mixedCase
Parameter LibDiamond.diamondCut(IDiamondCut.FacetCut[],address,bytes)._calldata (contracts/libs/LibDiamond.sol#47) is not in mixedCase
Parameter LibDiamond.addFunctions(address,bytes4[])._facetAddress (contracts/libs/LibDiamond.sol#79) is not in mixedCase
Parameter LibDiamond.addFunctions(address,bytes4[])._functionSelectors (contracts/libs/LibDiamond.sol#80) is not in mixedCase
Parameter LibDiamond.replaceFunctions(address,bytes4[])._facetAddress (contracts/libs/LibDiamond.sol#117) is not in mixedCase
Parameter LibDiamond.replaceFunctions(address,bytes4[])._functionSelectors (contracts/libs/LibDiamond.sol#118) is not in mixedCase
Parameter LibDiamond.removeFunctions(address,bytes4[])._facetAddress (contracts/libs/LibDiamond.sol#156) is not in mixedCase
Parameter LibDiamond.removeFunctions(address,bytes4[])._functionSelectors (contracts/libs/LibDiamond.sol#157) is not in mixedCase
Parameter LibDiamond.addFacet(LibDiamond.DiamondStorage,address)._facetAddress (contracts/libs/LibDiamond.sol#182) is not in mixedCase
Parameter LibDiamond.addFunction(LibDiamond.DiamondStorage,bytes4,uint96,address)._selector (contracts/libs/LibDiamond.sol#197) is not in mixedCase
Parameter LibDiamond.addFunction(LibDiamond.DiamondStorage,bytes4,uint96,address)._selectorPosition (contracts/libs/LibDiamond.sol#198) is not in mixedCase
Parameter LibDiamond.addFunction(LibDiamond.DiamondStorage,bytes4,uint96,address)._facetAddress (contracts/libs/LibDiamond.sol#199) is not in mixedCase
Parameter LibDiamond.removeFunction(LibDiamond.DiamondStorage,address,bytes4)._facetAddress (contracts/libs/LibDiamond.sol#212) is not in mixedCase
Parameter LibDiamond.removeFunction(LibDiamond.DiamondStorage,address,bytes4)._selector (contracts/libs/LibDiamond.sol#213) is not in mixedCase
Parameter LibDiamond.initializeDiamondCut(address,bytes)._init (contracts/libs/LibDiamond.sol#271) is not in mixedCase
Parameter LibDiamond.initializeDiamondCut(address,bytes)._calldata (contracts/libs/LibDiamond.sol#271) is not in mixedCase
Parameter LibDiamond.enforceHasContractCode(address,string)._contract (contracts/libs/LibDiamond.sol#303) is not in mixedCase
Parameter LibDiamond.enforceHasContractCode(address,string)._errorMessage (contracts/libs/LibDiamond.sol#304) is not in mixedCase
Parameter LibHub.getHub(uint256)._id (contracts/libs/LibHub.sol#57) is not in mixedCase
Parameter LibMeToken.updateBalancePooled(bool,address,uint256)._meToken (contracts/libs/LibMeToken.sol#27) is not in mixedCase
Parameter LibMeToken.updateBalancePooled(bool,address,uint256)._amount (contracts/libs/LibMeToken.sol#28) is not in mixedCase
Parameter LibMeToken.updateBalanceLocked(bool,address,uint256)._meToken (contracts/libs/LibMeToken.sol#43) is not in mixedCase
Parameter LibMeToken.updateBalanceLocked(bool,address,uint256)._amount (contracts/libs/LibMeToken.sol#44) is not in mixedCase
Parameter LibMeToken.finishResubscribe(address)._meToken (contracts/libs/LibMeToken.sol#57) is not in mixedCase
Parameter LibMeToken.getMeToken(address)._meToken (contracts/libs/LibMeToken.sol#84) is not in mixedCase
Parameter SameAssetTransferMigration.initMigration(address,bytes)._meToken (contracts/migrations/SameAssetTransferMigration.sol#34) is not in mixedCase
Parameter SameAssetTransferMigration.poke(address)._meToken (contracts/migrations/SameAssetTransferMigration.sol#50) is not in mixedCase
Parameter SameAssetTransferMigration.finishMigration(address)._meToken (contracts/migrations/SameAssetTransferMigration.sol#62) is not in mixedCase
Parameter SameAssetTransferMigration.getDetails(address)._meToken (contracts/migrations/SameAssetTransferMigration.sol#91) is not in mixedCase
Parameter SameAssetTransferMigration.isValid(address,bytes)._meToken (contracts/migrations/SameAssetTransferMigration.sol#101) is not in mixedCase
Parameter UniswapSingleTransferMigration.initMigration(address,bytes)._meToken (contracts/migrations/UniswapSingleTransferMigration.sol#51) is not in mixedCase
Parameter UniswapSingleTransferMigration.initMigration(address,bytes)._encodedArgs (contracts/migrations/UniswapSingleTransferMigration.sol#51) is not in mixedCase
Parameter UniswapSingleTransferMigration.poke(address)._meToken (contracts/migrations/UniswapSingleTransferMigration.sol#74) is not in mixedCase
Parameter UniswapSingleTransferMigration.finishMigration(address)._meToken (contracts/migrations/UniswapSingleTransferMigration.sol#92) is not in mixedCase
Parameter UniswapSingleTransferMigration.getDetails(address)._meToken (contracts/migrations/UniswapSingleTransferMigration.sol#125) is not in mixedCase
Parameter UniswapSingleTransferMigration.isValid(address,bytes)._meToken (contracts/migrations/UniswapSingleTransferMigration.sol#134) is not in mixedCase
Parameter UniswapSingleTransferMigration.isValid(address,bytes)._encodedArgs (contracts/migrations/UniswapSingleTransferMigration.sol#134) is not in mixedCase
Parameter Registry.approve(address)._addr (contracts/registries/Registry.sol#16) is not in mixedCase
Parameter Registry.unapprove(address)._addr (contracts/registries/Registry.sol#23) is not in mixedCase
Parameter Registry.isApproved(address)._addr (contracts/registries/Registry.sol#30) is not in mixedCase
Function ABDKMathQuad.log_2(bytes16) (contracts/utils/ABDKMathQuad.sol#616-689) is not in mixedCase
Function ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) is not in mixedCase
Constant ABDKMathQuad.NaN (contracts/utils/ABDKMathQuad.sol#42) is not in UPPER_CASE_WITH_UNDERSCORES
Parameter SingleAssetVault.startMigration(address)._meToken (contracts/vaults/SingleAssetVault.sol#23) is not in mixedCase
Parameter SingleAssetVault.isValid(address,bytes)._asset (contracts/vaults/SingleAssetVault.sol#43) is not in mixedCase
Parameter Vault.handleDeposit(address,address,uint256,uint256)._from (contracts/vaults/Vault.sol#41) is not in mixedCase
Parameter Vault.handleDeposit(address,address,uint256,uint256)._asset (contracts/vaults/Vault.sol#42) is not in mixedCase
Parameter Vault.handleDeposit(address,address,uint256,uint256)._depositAmount (contracts/vaults/Vault.sol#43) is not in mixedCase
Parameter Vault.handleDeposit(address,address,uint256,uint256)._feeAmount (contracts/vaults/Vault.sol#44) is not in mixedCase
Parameter Vault.handleWithdrawal(address,address,uint256,uint256)._to (contracts/vaults/Vault.sol#55) is not in mixedCase
Parameter Vault.handleWithdrawal(address,address,uint256,uint256)._asset (contracts/vaults/Vault.sol#56) is not in mixedCase
Parameter Vault.handleWithdrawal(address,address,uint256,uint256)._withdrawalAmount (contracts/vaults/Vault.sol#57) is not in mixedCase
Parameter Vault.handleWithdrawal(address,address,uint256,uint256)._feeAmount (contracts/vaults/Vault.sol#58) is not in mixedCase
Parameter Vault.claim(address,bool,uint256)._asset (contracts/vaults/Vault.sol#69) is not in mixedCase
Parameter Vault.claim(address,bool,uint256)._max (contracts/vaults/Vault.sol#70) is not in mixedCase
Parameter Vault.claim(address,bool,uint256)._amount (contracts/vaults/Vault.sol#71) is not in mixedCase
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#conformance-to-solidity-naming-conventions

Variable IUniswapV3SwapCallback.uniswapV3SwapCallback(int256,int256,bytes).amount0Delta (node_modules/@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol#17) is too similar to IUniswapV3SwapCallback.uniswapV3SwapCallback(int256,int256,bytes).amount1Delta (node_modules/@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3SwapCallback.sol#18)
Variable StepwiseCurve.initReconfigure(uint256,bytes).targetStepX (contracts/curves/StepwiseCurve.sol#58) is too similar to StepwiseCurve.initReconfigure(uint256,bytes).targetStepY (contracts/curves/StepwiseCurve.sol#58)
Variable StepwiseCurveABDK.viewAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/StepwiseCurveABDK.sol#141) is too similar to StepwiseCurveABDK._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256).meTokensBurned_ (contracts/curves/StepwiseCurveABDK.sol#253)
Variable StepwiseCurveABDK.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/StepwiseCurveABDK.sol#157) is too similar to StepwiseCurveABDK._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256).meTokensBurned_ (contracts/curves/StepwiseCurveABDK.sol#253)
Variable ICurve.viewAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/interfaces/ICurve.sol#56) is too similar to StepwiseCurveABDK._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256).meTokensBurned_ (contracts/curves/StepwiseCurveABDK.sol#253)
Variable StepwiseCurveABDK._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256)._meTokensBurned (contracts/curves/StepwiseCurveABDK.sol#237) is too similar to StepwiseCurveABDK._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256).meTokensBurned_ (contracts/curves/StepwiseCurveABDK.sol#253)
Variable ICurve.viewTargetAssetsReturned(uint256,uint256,uint256,uint256)._meTokensBurned (contracts/interfaces/ICurve.sol#82) is too similar to StepwiseCurveABDK._viewAssetsReturned(uint256,uint256,uint256,uint256,uint256).meTokensBurned_ (contracts/curves/StepwiseCurveABDK.sol#253)
Variable StepwiseCurveABDK.initReconfigure(uint256,bytes).targetStepX (contracts/curves/StepwiseCurveABDK.sol#62) is too similar to StepwiseCurveABDK.initReconfigure(uint256,bytes).targetStepY (contracts/curves/StepwiseCurveABDK.sol#62)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#variable-names-are-too-similar

Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x3442c4e6074a82f1797f72ac0000000 (contracts/curves/Power.sol#311)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x116b96f757c380fb287fd0e40000000 (contracts/curves/Power.sol#313)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x045ae5bdd5f0e03eca1ff4390000000 (contracts/curves/Power.sol#315)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00defabf91302cd95b9ffda50000000 (contracts/curves/Power.sol#317)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x002529ca9832b22439efff9b8000000 (contracts/curves/Power.sol#319)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00054f1cf12bd04e516b6da88000000 (contracts/curves/Power.sol#321)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000a9e39e257a09ca2d6db51000000 (contracts/curves/Power.sol#323)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x000012e066e7b839fa050c309000000 (contracts/curves/Power.sol#325)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x000001e33d7d926c329a1ad1a800000 (contracts/curves/Power.sol#327)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000002bee513bdb4a6b19b5f800000 (contracts/curves/Power.sol#329)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00000003a9316fa79b88eccf2a00000 (contracts/curves/Power.sol#331)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000000048177ebe1fa812375200000 (contracts/curves/Power.sol#333)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000000005263fe90242dcbacf00000 (contracts/curves/Power.sol#335)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x000000000057e22099c030d94100000 (contracts/curves/Power.sol#337)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000000000057e22099c030d9410000 (contracts/curves/Power.sol#339)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00000000000052b6b54569976310000 (contracts/curves/Power.sol#341)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00000000000004985f67696bf748000 (contracts/curves/Power.sol#343)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x000000000000003dea12ea99e498000 (contracts/curves/Power.sol#345)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00000000000000031880f2214b6e000 (contracts/curves/Power.sol#347)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x000000000000000025bcff56eb36000 (contracts/curves/Power.sol#349)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x000000000000000001b722e10ab1000 (contracts/curves/Power.sol#351)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000000000000000001317c70077000 (contracts/curves/Power.sol#353)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00000000000000000000cba84aafa00 (contracts/curves/Power.sol#355)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00000000000000000000082573a0a00 (contracts/curves/Power.sol#357)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00000000000000000000005035ad900 (contracts/curves/Power.sol#359)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x000000000000000000000002f881b00 (contracts/curves/Power.sol#361)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000000000000000000000001b29340 (contracts/curves/Power.sol#363)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x00000000000000000000000000efc40 (contracts/curves/Power.sol#365)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000000000000000000000000007fe0 (contracts/curves/Power.sol#367)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000000000000000000000000000420 (contracts/curves/Power.sol#369)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000000000000000000000000000021 (contracts/curves/Power.sol#371)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res += xi * 0x0000000000000000000000000000001 (contracts/curves/Power.sol#373)
Power.generalExp(uint256,uint8) (contracts/curves/Power.sol#302-377) uses literals with too many digits:
	- res / 0x688589cc0e9505e2f2fee5580000000 + _x + (ONE << _precision) (contracts/curves/Power.sol#375-376)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += 0x40000000000000000000000000000000 (contracts/curves/Power.sol#392)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += 0x20000000000000000000000000000000 (contracts/curves/Power.sol#396)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += 0x10000000000000000000000000000000 (contracts/curves/Power.sol#400)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += 0x08000000000000000000000000000000 (contracts/curves/Power.sol#404)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += 0x04000000000000000000000000000000 (contracts/curves/Power.sol#408)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += 0x02000000000000000000000000000000 (contracts/curves/Power.sol#412)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += 0x01000000000000000000000000000000 (contracts/curves/Power.sol#416)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += 0x00800000000000000000000000000000 (contracts/curves/Power.sol#420)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += (z * (0x100000000000000000000000000000000 - y)) / 0x100000000000000000000000000000000 (contracts/curves/Power.sol#426-428)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += (z * (0x0aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa - y)) / 0x200000000000000000000000000000000 (contracts/curves/Power.sol#430-432)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += (z * (0x099999999999999999999999999999999 - y)) / 0x300000000000000000000000000000000 (contracts/curves/Power.sol#434-436)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += (z * (0x092492492492492492492492492492492 - y)) / 0x400000000000000000000000000000000 (contracts/curves/Power.sol#438-440)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += (z * (0x08e38e38e38e38e38e38e38e38e38e38e - y)) / 0x500000000000000000000000000000000 (contracts/curves/Power.sol#442-444)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += (z * (0x08ba2e8ba2e8ba2e8ba2e8ba2e8ba2e8b - y)) / 0x600000000000000000000000000000000 (contracts/curves/Power.sol#446-448)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += (z * (0x089d89d89d89d89d89d89d89d89d89d89 - y)) / 0x700000000000000000000000000000000 (contracts/curves/Power.sol#450-452)
Power.optimalLog(uint256) (contracts/curves/Power.sol#384-459) uses literals with too many digits:
	- res += (z * (0x088888888888888888888888888888888 - y)) / 0x800000000000000000000000000000000 (contracts/curves/Power.sol#454-456)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- z = y = x % 0x10000000000000000000000000000000 (contracts/curves/Power.sol#472)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x00000618fee9f800 (contracts/curves/Power.sol#488)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x0000009c197dcc00 (contracts/curves/Power.sol#490)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x0000000e30dce400 (contracts/curves/Power.sol#492)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x000000012ebd1300 (contracts/curves/Power.sol#494)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x0000000017499f00 (contracts/curves/Power.sol#496)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x0000000001a9d480 (contracts/curves/Power.sol#498)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x00000000001c6380 (contracts/curves/Power.sol#500)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x000000000001c638 (contracts/curves/Power.sol#502)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x0000000000001ab8 (contracts/curves/Power.sol#504)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x000000000000017c (contracts/curves/Power.sol#506)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x0000000000000014 (contracts/curves/Power.sol#508)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res += z * 0x0000000000000001 (contracts/curves/Power.sol#510)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- (x & 0x010000000000000000000000000000000) != 0 (contracts/curves/Power.sol#513)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- (x & 0x020000000000000000000000000000000) != 0 (contracts/curves/Power.sol#517)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- (x & 0x040000000000000000000000000000000) != 0 (contracts/curves/Power.sol#521)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- (x & 0x080000000000000000000000000000000) != 0 (contracts/curves/Power.sol#525)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- (x & 0x100000000000000000000000000000000) != 0 (contracts/curves/Power.sol#529)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- (x & 0x200000000000000000000000000000000) != 0 (contracts/curves/Power.sol#533)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- (x & 0x400000000000000000000000000000000) != 0 (contracts/curves/Power.sol#537)
Power.optimalExp(uint256) (contracts/curves/Power.sol#466-543) uses literals with too many digits:
	- res = (res * 0x0002bf84208204f5977f9a8cf01fdc307) / 0x0000003c6ab775dd0b95b4cbee7e65d11 (contracts/curves/Power.sol#538-540)
BancorPower.slitherConstructorConstantVariables() (contracts/curves/BancorPower.sol#17-293) uses literals with too many digits:
	- FIXED_1 = 0x080000000000000000000000000000000 (contracts/curves/Power.sol#19)
BancorPower.slitherConstructorConstantVariables() (contracts/curves/BancorPower.sol#17-293) uses literals with too many digits:
	- FIXED_2 = 0x100000000000000000000000000000000 (contracts/curves/Power.sol#20)
BancorPower.slitherConstructorConstantVariables() (contracts/curves/BancorPower.sol#17-293) uses literals with too many digits:
	- MAX_NUM = 0x200000000000000000000000000000000 (contracts/curves/Power.sol#21)
BancorPower.slitherConstructorConstantVariables() (contracts/curves/BancorPower.sol#17-293) uses literals with too many digits:
	- OPT_EXP_MAX_VAL = 0x800000000000000000000000000000000 (contracts/curves/Power.sol#29-30)
ABDKMathQuad.toUInt(bytes16) (contracts/utils/ABDKMathQuad.sol#78-96) uses literals with too many digits:
	- require(bool)(uint128(x) < 0x80000000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#84)
ABDKMathQuad.toUInt(bytes16) (contracts/utils/ABDKMathQuad.sol#78-96) uses literals with too many digits:
	- result = (uint256(uint128(x)) & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFF) | 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#87-89)
ABDKMathQuad.cmp(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#106-135) uses literals with too many digits:
	- require(bool)(absoluteX <= 0x7FFF0000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#110)
ABDKMathQuad.cmp(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#106-135) uses literals with too many digits:
	- require(bool)(absoluteY <= 0x7FFF0000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#114)
ABDKMathQuad.cmp(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#106-135) uses literals with too many digits:
	- require(bool)(x != y || absoluteX < 0x7FFF0000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#117)
ABDKMathQuad.cmp(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#106-135) uses literals with too many digits:
	- negativeX = uint128(x) >= 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#121-122)
ABDKMathQuad.cmp(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#106-135) uses literals with too many digits:
	- negativeY = uint128(y) >= 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#123-124)
ABDKMathQuad.add(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#151-287) uses literals with too many digits:
	- xSign = uint128(x) >= 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#163)
ABDKMathQuad.add(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#151-287) uses literals with too many digits:
	- xSignifier |= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#167)
ABDKMathQuad.add(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#151-287) uses literals with too many digits:
	- ySign = uint128(y) >= 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#169)
ABDKMathQuad.add(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#151-287) uses literals with too many digits:
	- ySignifier |= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#173)
ABDKMathQuad.add(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#151-287) uses literals with too many digits:
	- xSignifier >= 0x20000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#193)
ABDKMathQuad.add(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#151-287) uses literals with too many digits:
	- xSignifier < 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#202)
ABDKMathQuad.add(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#151-287) uses literals with too many digits:
	- bytes16(uint128((0x80000000000000000000000000000000) | (xExponent << 112) | xSignifier)) (contracts/utils/ABDKMathQuad.sol#206-217)
ABDKMathQuad.add(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#151-287) uses literals with too many digits:
	- bytes16(uint128((0x80000000000000000000000000000000) | (xExponent << 112) | xSignifier)) (contracts/utils/ABDKMathQuad.sol#271-282)
ABDKMathQuad.sub(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#303-307) uses literals with too many digits:
	- add(x,y ^ 0x80000000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#305)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- x ^ (y & 0x80000000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#336)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- x ^ y == 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#337)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- x ^ (y & 0x80000000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#342)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- y ^ (x & 0x80000000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#346)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- xSignifier |= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#351)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- ySignifier |= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#356)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- bytes16(uint128(uint128((x ^ y) & 0x80000000000000000000000000000000) | (xExponent << 112) | xSignifier)) (contracts/utils/ABDKMathQuad.sol#397-406)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- (x ^ y) & 0x80000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#360-363)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- xSignifier >= 0x200000000000000000000000000000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#367-373)
ABDKMathQuad.mul(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#328-409) uses literals with too many digits:
	- xSignifier >= 0x100000000000000000000000000000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#367-373)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- x ^ (y & 0x80000000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#452)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- _POSITIVE_ZERO | ((x ^ y) & 0x80000000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#456-458)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- _POSITIVE_INFINITY | ((x ^ y) & 0x80000000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#462-464)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- ySignifier |= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#469)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- xSignifier = (xSignifier | 0x10000000000000000000000000000) << 114 (contracts/utils/ABDKMathQuad.sol#483-485)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- assert(bool)(xSignifier >= 0x1000000000000000000000000000) (contracts/utils/ABDKMathQuad.sol#495)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- bytes16(uint128(uint128((x ^ y) & 0x80000000000000000000000000000000) | (xExponent << 112) | xSignifier)) (contracts/utils/ABDKMathQuad.sol#530-539)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- (x ^ y) & 0x80000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#490-493)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- xSignifier >= 0x80000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#497-503)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- xSignifier >= 0x40000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#497-503)
ABDKMathQuad.div(bytes16,bytes16) (contracts/utils/ABDKMathQuad.sol#445-542) uses literals with too many digits:
	- xSignifier >= 0x20000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#497-503)
ABDKMathQuad.sqrt(bytes16) (contracts/utils/ABDKMathQuad.sol#550-608) uses literals with too many digits:
	- uint128(x) > 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#552)
ABDKMathQuad.sqrt(bytes16) (contracts/utils/ABDKMathQuad.sol#550-608) uses literals with too many digits:
	- xSignifier |= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#560)
ABDKMathQuad.sqrt(bytes16) (contracts/utils/ABDKMathQuad.sol#550-608) uses literals with too many digits:
	- xSignifier >= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#568)
ABDKMathQuad.sqrt(bytes16) (contracts/utils/ABDKMathQuad.sol#550-608) uses literals with too many digits:
	- xSignifier >= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#577)
ABDKMathQuad.sqrt(bytes16) (contracts/utils/ABDKMathQuad.sol#550-608) uses literals with too many digits:
	- r = 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#587)
ABDKMathQuad.log_2(bytes16) (contracts/utils/ABDKMathQuad.sol#616-689) uses literals with too many digits:
	- uint128(x) > 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#618)
ABDKMathQuad.log_2(bytes16) (contracts/utils/ABDKMathQuad.sol#616-689) uses literals with too many digits:
	- x == 0x3FFF0000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#619)
ABDKMathQuad.log_2(bytes16) (contracts/utils/ABDKMathQuad.sol#616-689) uses literals with too many digits:
	- xSignifier |= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#628)
ABDKMathQuad.log_2(bytes16) (contracts/utils/ABDKMathQuad.sol#616-689) uses literals with too many digits:
	- xSignifier >= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#642)
ABDKMathQuad.log_2(bytes16) (contracts/utils/ABDKMathQuad.sol#616-689) uses literals with too many digits:
	- xSignifier == 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#652)
ABDKMathQuad.log_2(bytes16) (contracts/utils/ABDKMathQuad.sol#616-689) uses literals with too many digits:
	- resultSignifier < 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#661)
ABDKMathQuad.log_2(bytes16) (contracts/utils/ABDKMathQuad.sol#616-689) uses literals with too many digits:
	- bytes16(uint128((0x80000000000000000000000000000000) | (resultExponent << 112) | (resultSignifier & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFF))) (contracts/utils/ABDKMathQuad.sol#673-685)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xNegative = uint128(x) > 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#711)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- 0x3FFF0000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#719)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier |= 0x10000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#722)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xNegative && xSignifier > 0x406E00000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#728-729)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#744)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x80000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#745)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x40000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#750)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x20000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#755)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x10000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#760)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x8000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#765)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x4000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#770)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x2000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#775)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x1000000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#780)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x800000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#785)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x400000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#790)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x200000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#795)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x100000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#800)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x80000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#805)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x40000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#810)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x20000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#815)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x10000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#820)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x8000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#825)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x4000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#830)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x2000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#835)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x1000000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#840)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000B1721BCFC99D9F890EA06911763) >> 128 (contracts/utils/ABDKMathQuad.sol#841-844)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x800000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#845)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000058B90CF1E6D97F9CA14DBCC1628) >> 128 (contracts/utils/ABDKMathQuad.sol#846-849)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x400000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#850)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000002C5C863B73F016468F6BAC5CA2B) >> 128 (contracts/utils/ABDKMathQuad.sol#851-854)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x200000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#855)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000162E430E5A18F6119E3C02282A5) >> 128 (contracts/utils/ABDKMathQuad.sol#856-859)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x100000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#860)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000B1721835514B86E6D96EFD1BFE) >> 128 (contracts/utils/ABDKMathQuad.sol#861-864)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x80000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#865)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000058B90C0B48C6BE5DF846C5B2EF) >> 128 (contracts/utils/ABDKMathQuad.sol#866-869)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x40000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#870)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000002C5C8601CC6B9E94213C72737A) >> 128 (contracts/utils/ABDKMathQuad.sol#871-874)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x20000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#875)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000162E42FFF037DF38AA2B219F06) >> 128 (contracts/utils/ABDKMathQuad.sol#876-879)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x10000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#880)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000B17217FBA9C739AA5819F44F9) >> 128 (contracts/utils/ABDKMathQuad.sol#881-884)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x8000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#885)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000058B90BFCDEE5ACD3C1CEDC823) >> 128 (contracts/utils/ABDKMathQuad.sol#886-889)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x4000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#890)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000002C5C85FE31F35A6A30DA1BE50) >> 128 (contracts/utils/ABDKMathQuad.sol#891-894)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x2000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#895)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000162E42FF0999CE3541B9FFFCF) >> 128 (contracts/utils/ABDKMathQuad.sol#896-899)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x1000000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#900)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000B17217F80F4EF5AADDA45554) >> 128 (contracts/utils/ABDKMathQuad.sol#901-904)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x800000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#905)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000058B90BFBF8479BD5A81B51AD) >> 128 (contracts/utils/ABDKMathQuad.sol#906-909)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x400000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#910)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000002C5C85FDF84BD62AE30A74CC) >> 128 (contracts/utils/ABDKMathQuad.sol#911-914)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x200000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#915)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000162E42FEFB2FED257559BDAA) >> 128 (contracts/utils/ABDKMathQuad.sol#916-919)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x100000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#920)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000B17217F7D5A7716BBA4A9AE) >> 128 (contracts/utils/ABDKMathQuad.sol#921-924)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x80000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#925)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000058B90BFBE9DDBAC5E109CCE) >> 128 (contracts/utils/ABDKMathQuad.sol#926-929)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x40000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#930)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000002C5C85FDF4B15DE6F17EB0D) >> 128 (contracts/utils/ABDKMathQuad.sol#931-934)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x20000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#935)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000162E42FEFA494F1478FDE05) >> 128 (contracts/utils/ABDKMathQuad.sol#936-939)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x10000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#940)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000B17217F7D20CF927C8E94C) >> 128 (contracts/utils/ABDKMathQuad.sol#941-944)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x8000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#945)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000058B90BFBE8F71CB4E4B33D) >> 128 (contracts/utils/ABDKMathQuad.sol#946-949)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x4000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#950)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000002C5C85FDF477B662B26945) >> 128 (contracts/utils/ABDKMathQuad.sol#951-954)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x2000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#955)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000162E42FEFA3AE53369388C) >> 128 (contracts/utils/ABDKMathQuad.sol#956-959)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x1000000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#960)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000B17217F7D1D351A389D40) >> 128 (contracts/utils/ABDKMathQuad.sol#961-964)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x800000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#965)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000058B90BFBE8E8B2D3D4EDE) >> 128 (contracts/utils/ABDKMathQuad.sol#966-969)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x400000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#970)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000002C5C85FDF4741BEA6E77E) >> 128 (contracts/utils/ABDKMathQuad.sol#971-974)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x200000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#975)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000162E42FEFA39FE95583C2) >> 128 (contracts/utils/ABDKMathQuad.sol#976-979)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x100000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#980)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000B17217F7D1CFB72B45E1) >> 128 (contracts/utils/ABDKMathQuad.sol#981-984)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x80000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#985)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000058B90BFBE8E7CC35C3F0) >> 128 (contracts/utils/ABDKMathQuad.sol#986-989)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x40000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#990)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000002C5C85FDF473E242EA38) >> 128 (contracts/utils/ABDKMathQuad.sol#991-994)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x20000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#995)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000162E42FEFA39F02B772C) >> 128 (contracts/utils/ABDKMathQuad.sol#996-999)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x10000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1000)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000B17217F7D1CF7D83C1A) >> 128 (contracts/utils/ABDKMathQuad.sol#1001-1004)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x8000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1005)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000058B90BFBE8E7BDCBE2E) >> 128 (contracts/utils/ABDKMathQuad.sol#1006-1009)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x4000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1010)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000002C5C85FDF473DEA871F) >> 128 (contracts/utils/ABDKMathQuad.sol#1011-1014)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x2000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1015)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000162E42FEFA39EF44D91) >> 128 (contracts/utils/ABDKMathQuad.sol#1016-1019)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x1000000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1020)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000B17217F7D1CF79E949) >> 128 (contracts/utils/ABDKMathQuad.sol#1021-1024)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x800000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1025)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000058B90BFBE8E7BCE544) >> 128 (contracts/utils/ABDKMathQuad.sol#1026-1029)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x400000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1030)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000002C5C85FDF473DE6ECA) >> 128 (contracts/utils/ABDKMathQuad.sol#1031-1034)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x200000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1035)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000162E42FEFA39EF366F) >> 128 (contracts/utils/ABDKMathQuad.sol#1036-1039)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x100000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1040)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000B17217F7D1CF79AFA) >> 128 (contracts/utils/ABDKMathQuad.sol#1041-1044)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x80000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1045)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000058B90BFBE8E7BCD6D) >> 128 (contracts/utils/ABDKMathQuad.sol#1046-1049)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x40000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1050)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000002C5C85FDF473DE6B2) >> 128 (contracts/utils/ABDKMathQuad.sol#1051-1054)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x20000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1055)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000162E42FEFA39EF358) >> 128 (contracts/utils/ABDKMathQuad.sol#1056-1059)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x10000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1060)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000B17217F7D1CF79AB) >> 128 (contracts/utils/ABDKMathQuad.sol#1061-1064)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x8000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1065)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000058B90BFBE8E7BCD5) >> 128 (contracts/utils/ABDKMathQuad.sol#1066-1069)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x4000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1070)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000002C5C85FDF473DE6A) >> 128 (contracts/utils/ABDKMathQuad.sol#1071-1074)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x2000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1075)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000162E42FEFA39EF34) >> 128 (contracts/utils/ABDKMathQuad.sol#1076-1079)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x1000000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1080)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000B17217F7D1CF799) >> 128 (contracts/utils/ABDKMathQuad.sol#1081-1084)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x800000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1085)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000058B90BFBE8E7BCC) >> 128 (contracts/utils/ABDKMathQuad.sol#1086-1089)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x400000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1090)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000002C5C85FDF473DE5) >> 128 (contracts/utils/ABDKMathQuad.sol#1091-1094)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x200000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1095)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000162E42FEFA39EF2) >> 128 (contracts/utils/ABDKMathQuad.sol#1096-1099)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x100000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1100)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000B17217F7D1CF78) >> 128 (contracts/utils/ABDKMathQuad.sol#1101-1104)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x80000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1105)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000058B90BFBE8E7BB) >> 128 (contracts/utils/ABDKMathQuad.sol#1106-1109)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x40000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1110)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000002C5C85FDF473DD) >> 128 (contracts/utils/ABDKMathQuad.sol#1111-1114)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x20000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1115)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000162E42FEFA39EE) >> 128 (contracts/utils/ABDKMathQuad.sol#1116-1119)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x10000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1120)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000B17217F7D1CF6) >> 128 (contracts/utils/ABDKMathQuad.sol#1121-1124)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x8000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1125)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000058B90BFBE8E7A) >> 128 (contracts/utils/ABDKMathQuad.sol#1126-1129)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x4000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1130)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000002C5C85FDF473C) >> 128 (contracts/utils/ABDKMathQuad.sol#1131-1134)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x2000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1135)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000162E42FEFA39D) >> 128 (contracts/utils/ABDKMathQuad.sol#1136-1139)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x1000000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1140)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000B17217F7D1CE) >> 128 (contracts/utils/ABDKMathQuad.sol#1141-1144)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x800000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1145)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000058B90BFBE8E6) >> 128 (contracts/utils/ABDKMathQuad.sol#1146-1149)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x400000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1150)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000002C5C85FDF472) >> 128 (contracts/utils/ABDKMathQuad.sol#1151-1154)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x200000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1155)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000162E42FEFA38) >> 128 (contracts/utils/ABDKMathQuad.sol#1156-1159)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x100000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1160)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000B17217F7D1B) >> 128 (contracts/utils/ABDKMathQuad.sol#1161-1164)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x80000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1165)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000058B90BFBE8D) >> 128 (contracts/utils/ABDKMathQuad.sol#1166-1169)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x40000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1170)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000002C5C85FDF46) >> 128 (contracts/utils/ABDKMathQuad.sol#1171-1174)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x20000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1175)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000162E42FEFA2) >> 128 (contracts/utils/ABDKMathQuad.sol#1176-1179)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x10000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1180)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000B17217F7D0) >> 128 (contracts/utils/ABDKMathQuad.sol#1181-1184)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x8000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1185)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000058B90BFBE7) >> 128 (contracts/utils/ABDKMathQuad.sol#1186-1189)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x4000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1190)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000002C5C85FDF3) >> 128 (contracts/utils/ABDKMathQuad.sol#1191-1194)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x2000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1195)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000162E42FEF9) >> 128 (contracts/utils/ABDKMathQuad.sol#1196-1199)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x1000000000 > 0 (contracts/utils/ABDKMathQuad.sol#1200)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000B17217F7C) >> 128 (contracts/utils/ABDKMathQuad.sol#1201-1204)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x800000000 > 0 (contracts/utils/ABDKMathQuad.sol#1205)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000058B90BFBD) >> 128 (contracts/utils/ABDKMathQuad.sol#1206-1209)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x400000000 > 0 (contracts/utils/ABDKMathQuad.sol#1210)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000002C5C85FDE) >> 128 (contracts/utils/ABDKMathQuad.sol#1211-1214)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x200000000 > 0 (contracts/utils/ABDKMathQuad.sol#1215)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000162E42FEE) >> 128 (contracts/utils/ABDKMathQuad.sol#1216-1219)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x100000000 > 0 (contracts/utils/ABDKMathQuad.sol#1220)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000000B17217F6) >> 128 (contracts/utils/ABDKMathQuad.sol#1221-1224)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x80000000 > 0 (contracts/utils/ABDKMathQuad.sol#1225)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000058B90BFA) >> 128 (contracts/utils/ABDKMathQuad.sol#1226-1229)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x40000000 > 0 (contracts/utils/ABDKMathQuad.sol#1230)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000002C5C85FC) >> 128 (contracts/utils/ABDKMathQuad.sol#1231-1234)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x20000000 > 0 (contracts/utils/ABDKMathQuad.sol#1235)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000000162E42FD) >> 128 (contracts/utils/ABDKMathQuad.sol#1236-1239)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x10000000 > 0 (contracts/utils/ABDKMathQuad.sol#1240)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000000B17217E) >> 128 (contracts/utils/ABDKMathQuad.sol#1241-1244)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x8000000 > 0 (contracts/utils/ABDKMathQuad.sol#1245)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000000058B90BE) >> 128 (contracts/utils/ABDKMathQuad.sol#1246-1249)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x4000000 > 0 (contracts/utils/ABDKMathQuad.sol#1250)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000002C5C85E) >> 128 (contracts/utils/ABDKMathQuad.sol#1251-1254)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x2000000 > 0 (contracts/utils/ABDKMathQuad.sol#1255)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000000162E42E) >> 128 (contracts/utils/ABDKMathQuad.sol#1256-1259)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x1000000 > 0 (contracts/utils/ABDKMathQuad.sol#1260)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000B17216) >> 128 (contracts/utils/ABDKMathQuad.sol#1261-1264)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x800000 > 0 (contracts/utils/ABDKMathQuad.sol#1265)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000000058B90A) >> 128 (contracts/utils/ABDKMathQuad.sol#1266-1269)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x400000 > 0 (contracts/utils/ABDKMathQuad.sol#1270)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000000002C5C84) >> 128 (contracts/utils/ABDKMathQuad.sol#1271-1274)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x200000 > 0 (contracts/utils/ABDKMathQuad.sol#1275)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000162E41) >> 128 (contracts/utils/ABDKMathQuad.sol#1276-1279)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- xSignifier & 0x100000 > 0 (contracts/utils/ABDKMathQuad.sol#1280)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000000000B1720) >> 128 (contracts/utils/ABDKMathQuad.sol#1281-1284)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000058B8F) >> 128 (contracts/utils/ABDKMathQuad.sol#1286-1289)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000000002C5C7) >> 128 (contracts/utils/ABDKMathQuad.sol#1291-1294)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000000000162E3) >> 128 (contracts/utils/ABDKMathQuad.sol#1296-1299)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000000000B171) >> 128 (contracts/utils/ABDKMathQuad.sol#1301-1304)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000000000058B8) >> 128 (contracts/utils/ABDKMathQuad.sol#1306-1309)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000002C5B) >> 128 (contracts/utils/ABDKMathQuad.sol#1311-1314)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000000000162D) >> 128 (contracts/utils/ABDKMathQuad.sol#1316-1319)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000000B16) >> 128 (contracts/utils/ABDKMathQuad.sol#1321-1324)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000000000058A) >> 128 (contracts/utils/ABDKMathQuad.sol#1326-1329)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000000000002C4) >> 128 (contracts/utils/ABDKMathQuad.sol#1331-1334)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000000161) >> 128 (contracts/utils/ABDKMathQuad.sol#1336-1339)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x1000000000000000000000000000000B0) >> 128 (contracts/utils/ABDKMathQuad.sol#1341-1344)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000000057) >> 128 (contracts/utils/ABDKMathQuad.sol#1346-1349)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000000000002B) >> 128 (contracts/utils/ABDKMathQuad.sol#1351-1354)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000000015) >> 128 (contracts/utils/ABDKMathQuad.sol#1356-1359)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x10000000000000000000000000000000A) >> 128 (contracts/utils/ABDKMathQuad.sol#1361-1364)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000000004) >> 128 (contracts/utils/ABDKMathQuad.sol#1366-1369)
ABDKMathQuad.pow_2(bytes16) (contracts/utils/ABDKMathQuad.sol#709-1397) uses literals with too many digits:
	- resultSignifier = (resultSignifier * 0x100000000000000000000000000000001) >> 128 (contracts/utils/ABDKMathQuad.sol#1371-1374)
ABDKMathQuad.mostSignificantBit(uint256) (contracts/utils/ABDKMathQuad.sol#1418-1456) uses literals with too many digits:
	- x >= 0x100000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#1424)
ABDKMathQuad.mostSignificantBit(uint256) (contracts/utils/ABDKMathQuad.sol#1418-1456) uses literals with too many digits:
	- x >= 0x10000000000000000 (contracts/utils/ABDKMathQuad.sol#1428)
ABDKMathQuad.mostSignificantBit(uint256) (contracts/utils/ABDKMathQuad.sol#1418-1456) uses literals with too many digits:
	- x >= 0x100000000 (contracts/utils/ABDKMathQuad.sol#1432)
ABDKMathQuad.slitherConstructorConstantVariables() (contracts/utils/ABDKMathQuad.sol#14-1457) uses literals with too many digits:
	- _POSITIVE_ZERO = 0x00000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#18-19)
ABDKMathQuad.slitherConstructorConstantVariables() (contracts/utils/ABDKMathQuad.sol#14-1457) uses literals with too many digits:
	- _NEGATIVE_ZERO = 0x80000000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#24-25)
ABDKMathQuad.slitherConstructorConstantVariables() (contracts/utils/ABDKMathQuad.sol#14-1457) uses literals with too many digits:
	- _POSITIVE_INFINITY = 0x7FFF0000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#30-31)
ABDKMathQuad.slitherConstructorConstantVariables() (contracts/utils/ABDKMathQuad.sol#14-1457) uses literals with too many digits:
	- _NEGATIVE_INFINITY = 0xFFFF0000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#36-37)
ABDKMathQuad.slitherConstructorConstantVariables() (contracts/utils/ABDKMathQuad.sol#14-1457) uses literals with too many digits:
	- NaN = 0x7FFF8000000000000000000000000000 (contracts/utils/ABDKMathQuad.sol#42)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#too-many-digits

Power.version (contracts/curves/Power.sol#13) should be constant
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#state-variables-that-could-be-declared-constant

renounceOwnership() should be declared external:
	- Ownable.renounceOwnership() (node_modules/@openzeppelin/contracts/access/Ownable.sol#54-56)
transferOwnership(address) should be declared external:
	- Ownable.transferOwnership(address) (node_modules/@openzeppelin/contracts/access/Ownable.sol#62-65)
name() should be declared external:
	- ERC20.name() (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#62-64)
symbol() should be declared external:
	- ERC20.symbol() (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#70-72)
decimals() should be declared external:
	- ERC20.decimals() (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#87-89)
totalSupply() should be declared external:
	- ERC20.totalSupply() (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#94-96)
balanceOf(address) should be declared external:
	- ERC20.balanceOf(address) (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#101-103)
transfer(address,uint256) should be declared external:
	- ERC20.transfer(address,uint256) (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#113-117)
approve(address,uint256) should be declared external:
	- ERC20.approve(address,uint256) (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#136-140)
transferFrom(address,address,uint256) should be declared external:
	- ERC20.transferFrom(address,address,uint256) (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#158-167)
increaseAllowance(address,uint256) should be declared external:
	- ERC20.increaseAllowance(address,uint256) (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#181-185)
decreaseAllowance(address,uint256) should be declared external:
	- ERC20.decreaseAllowance(address,uint256) (node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol#201-210)
burn(uint256) should be declared external:
	- ERC20Burnable.burn(uint256) (node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol#20-22)
burnFrom(address,uint256) should be declared external:
	- ERC20Burnable.burnFrom(address,uint256) (node_modules/@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol#35-38)
Reference: https://github.com/crytic/slither/wiki/Detector-Documentation#public-function-that-could-be-declared-external
. analyzed (61 contracts with 77 detectors), 837 result(s) found

```
