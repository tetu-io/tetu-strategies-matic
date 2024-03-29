import {ethers} from "hardhat";
import {BigNumber} from "ethers";
import {formatUnits} from "ethers/lib/utils";
import {writeFileSync} from "fs";
import {Web3Utils} from "./utils/tools/Web3Utils";
import {
  ERC20__factory,
  ERC721__factory,
  IHypervisor__factory,
  IPositionManager__factory,
  IUni3Pool__factory,
  Uni3LiqCalc__factory
} from "../typechain";
import {Misc} from "./utils/tools/Misc";

const ALL_HOLDERS = new Map<string, string>([
  ['0xcEa27B18cA254e4f2ec92aE53255060b5A490B70'.toLowerCase(), '7.559916'],
  ['0x88888887C3ebD4a33E34a15Db4254C74C75E5D4A'.toLowerCase(), '1.068558'],
  ['0x0644141DD9C2c34802d28D334217bD2034206Bf7'.toLowerCase(), '40427.877382'],
  ['0xca1F1E5248b391E64Dd160FC14694C9da088aF96'.toLowerCase(), '4898.191854'],
  ['0xa69E15c6aa3667484d278F19701b2DE54aa05F9b'.toLowerCase(), '9.938874'],
  ['0xcBC3f3DEe4808b1115773139c51D0E05Bf22EF92'.toLowerCase(), '2.961972'],
  ['0x31e946c9C5A6082978E4Dd068e0cBc180ea617D6'.toLowerCase(), '0.497757'],
  ['0x2F5294b805f6c0b4B7942c88111d8fB3c0597051'.toLowerCase(), '15.436603'],
  ['0xCAE1B304a284c700D93c861Ceebce054d837dbf3'.toLowerCase(), '2477.942377'],
  ['0x51c1ce246708B2A198F7e7e9DC3D154eE4cd9572'.toLowerCase(), '80.001604'],
  ['0x8cA3ed3B33C85f28635339541319086BB7626EE5'.toLowerCase(), '0.846753'],
  ['0xAA79498766A787bD1DEA8Ce53DE7603F62DcD2f6'.toLowerCase(), '1462.256055'],
  ['0x941eAaF5F9f8463bEC0cc22Da1daDA6F0d30E28a'.toLowerCase(), '3962.815637'],
  ['0xdd4944a8C06A5eEFae1ABd90C37955Bb47533874'.toLowerCase(), '1.485721'],
  ['0xAF1bff74708098dB603e48aaEbEC1BBAe03Dcf11'.toLowerCase(), '2966.829712'],
  ['0x17b1d9a1a8F0363E04bcCDF2839cB107B2297774'.toLowerCase(), '195.060417'],
  ['0x1a8042DeD3d7B02929a1BEC785a5325B2E89EAd8'.toLowerCase(), '2.028814'],
  ['0x64b238b98C80C7f9bd598c308D46C69407227Cd2'.toLowerCase(), '16.658625'],
  ['0xecF1F56e82C4E225C1f6739cF11D39C378eC1aE4'.toLowerCase(), '99.998577'],
  ['0x0BC2a73035A8Ee8E069940e99E18eD985dD2e870'.toLowerCase(), '0.0982'],
  ['0x4a9BD7D575e284FeAc0E8DA501Db32089B2C8B4C'.toLowerCase(), '0.001371'],
  ['0xfB0a73D2E87c5EC9D4a721f25fD5DA71AbE0a910'.toLowerCase(), '39654.924458'],
  ['0x093CfB323E28bd797224E3b994E3496a0d14660F'.toLowerCase(), '39393.497197'],
  ['0x36Fefa17f0754D814e323358CA18E809e4cD4b12'.toLowerCase(), '39015.912547'],
  ['0xd30126cDd9BbB338E0ca5A8d504B2EC2d43488c7'.toLowerCase(), '0.159634'],
  ['0x38cC8E2bFe87BA71a0b4c893D5A94FbDcbd5e5Ec'.toLowerCase(), '6.000237'],
  ['0xa94C873218fF65172f3461d1F4389D05434Df6bb'.toLowerCase(), '0.000007'],
  ['0x2C29A4cF9Cf49dBd0495DAfbD8343acdb2Fec6dd'.toLowerCase(), '25.279244'],
  ['0xc06a4eb12eB8a7c47a5Bf0cf19A42935CDDEEe75'.toLowerCase(), '6.681599'],
  ['0x4FcdB2DCc4Ce156c723aD541dba8B39d47284FC5'.toLowerCase(), '14829.169482'],
  ['0x88C5ED1f1524F96FDF7ab8f11434cE4DEe96D7a1'.toLowerCase(), '30.73329'],
  ['0xaC44f57eEF260eB6E0f896b61984Da8d86FeE9ed'.toLowerCase(), '47.933192'],
  ['0x71E7D05bE74fF748c45402c06A941c822d756dc5'.toLowerCase(), '0.94'],
  ['0xF5A4D5d1921D0114b456982D077f8D0987255188'.toLowerCase(), '0.184441'],
  ['0x193Db18A5EF9a0320b7374C1fE8Af976235f3211'.toLowerCase(), '9.217873'],
  ['0x4f82e73EDb06d29Ff62C91EC8f5Ff06571bdeb29'.toLowerCase(), '6.068801'],
  ['0xc51a5D21757c1A1eED2Be5EeBbD40e3c6417518a'.toLowerCase(), '19.037508'],
  ['0xf99C8873B972b4192e789F55AB954188D0d9A133'.toLowerCase(), '0.000387'],
  ['0x123F5f511414Abe44EB38f9b88414808A1517E71'.toLowerCase(), '0.003774'],
  ['0x20D61737f972EEcB0aF5f0a85ab358Cd083Dd56a'.toLowerCase(), '225829.790008'],
  ['0x79241f977195000B2406418c139BADb1a7bB04B4'.toLowerCase(), '0.416398'],
  ['0x6486CCBF0091f82Bf6a9869AA068b6e707f74097'.toLowerCase(), '3.443498'],
  ['0x1dAA57A0B066Bd4303Ee65f7D51dAd62366d65F9'.toLowerCase(), '0.048357'],
  ['0x09Fa38EBa245bb68354B8950FA2fe71f02863393'.toLowerCase(), '5.671302'],
  ['0x5a2C70B16B9Cfd4b81Aa86D0175FF139dC23Ba1c'.toLowerCase(), '19.424721'],
  ['0x0d374583Fb42Ac6463b83371C620707535d45633'.toLowerCase(), '0.079779'],
  ['0x947ebecd725e07baC225363F328De957AA5819b3'.toLowerCase(), '5.141493'],
  ['0xE6Fb2B218385FF1FFbA914775A35c1A121446CEF'.toLowerCase(), '0.395432'],
  ['0xE382620E8F0d27af43b32bC34C6c5aE3b96995d9'.toLowerCase(), '4.207354'],
  ['0x175D9b7BEf31cC753D1d94Ee70d90F23aBF94070'.toLowerCase(), '0.098934'],
  ['0x7322BB074c8FC26a2D9914d776Ae7880bb507f18'.toLowerCase(), '0.873542'],
  ['0x7754d8b057CC1d2D857d897461DAC6C3235B4aAe'.toLowerCase(), '1.714077'],
  ['0x4b7E5cd5654b8173F7BC393B138A89DCcf85Bcf7'.toLowerCase(), '1.931065'],
  ['0xa8a29010ebF4065b9324750eAE523AAF0744f693'.toLowerCase(), '5.2231'],
  ['0x53C49b9308c3DB176d351d7914Cec0Fb5D7f1129'.toLowerCase(), '3.988039'],
  ['0x29173d2cA61813d90B49A1e715BA59eE49377114'.toLowerCase(), '0.00111'],
  ['0x4d0DE5C4cfC4eafaffbb5246A7CCB3A86626A92A'.toLowerCase(), '0.011153'],
  ['0x1164e81BFA7FC4FF6117f073176d96798305eD60'.toLowerCase(), '0.022943'],
  ['0x36023e16C51B40d89526f1cE35c421903A8f1B9D'.toLowerCase(), '0.040769'],
  ['0x0A609874B32C38856D6e6a546330Af6fFB40528A'.toLowerCase(), '0.009385'],
  ['0x84f240cA232917d771DFBbd8C917B4669Ed640CD'.toLowerCase(), '0.024782'],
  ['0x4920a95670B6282951813a94D9066A730D315df3'.toLowerCase(), '0.000287'],
  ['0xbf9b4D7FbD072A17D39Df9f2a51f764Ef047F457'.toLowerCase(), '0.004178'],
  ['0x5Be66f4095f89BD18aBE4aE9d2acD5021EC433Bc'.toLowerCase(), '0.009693'],
  ['0x32Af25467b00aAe516505B3331cfEc52092ea5BA'.toLowerCase(), '0.001453'],
  ['0xe116d5F4CcD817e93a4827B4B1166fB3fA61BEC5'.toLowerCase(), '0.001151'],
  ['0xa3F2d88fB722d4f2a082Edbf98354b81DC34829e'.toLowerCase(), '0.661892'],
  ['0x1F452Ea54d4d934AfAdc300C61ca0A3B1bbDE958'.toLowerCase(), '0.007137'],
  ['0x03A1a0EE0e2a14bd069c8691a4adEAbFa6a4d709'.toLowerCase(), '0.01186'],
  ['0x7727BA1EB86f94D74EfbB7aFdDED7f8fB99d2065'.toLowerCase(), '0.013954'],
  ['0xE500120D91ac194a690729026363c180bC19ad2C'.toLowerCase(), '0.003948'],
  ['0x7976bE935080B2574390717dF3Af6739aFB81EaF'.toLowerCase(), '0.005693'],
  ['0x9688A203Ccad04fE91AeE1A521Ef91203763F55f'.toLowerCase(), '0.002838'],
  ['0x4eE67d558e065C6655f6a871A881e4717d97d1bD'.toLowerCase(), '0.004564'],
  ['0xe06EA9a4FcBB05e5b0e43298bF42BD631986C8Df'.toLowerCase(), '0.000287'],
  ['0x47Dee11e0D84F05d7726b69666595700F3f0d883'.toLowerCase(), '0.033513'],
  ['0x06Af6c9f6fAc18127A98B8E59ed3d36B2C7269CD'.toLowerCase(), '0.00145'],
  ['0x1EbB73f5F47Bcc3D7dC1dabf7284875E3AE40E07'.toLowerCase(), '0.000095'],
  ['0x1b8c43B49CF37D10484D6AF505A6e6D5E4897C25'.toLowerCase(), '0.963465'],
  ['0x20a2454B42E3EEE43dd83bD98506C04DC614Fe62'.toLowerCase(), '230.402348'],
  ['0xAD8904D6563E3348b178ddCf49B312137C992e51'.toLowerCase(), '0.000046'],
  ['0x4Fd7F10d633dAC3453606e36449F9Fd2342b6018'.toLowerCase(), '0.058893'],
  ['0xB3e5f9f58040e06A34304C3563b8ed50f0aC2960'.toLowerCase(), '0.955267'],
  ['0xaA04b6b109Db200c2101Bd34aBf2847a112d47A9'.toLowerCase(), '0.001118'],
  ['0x848887741B3e38233Cd858c5dD7B48Ca9197FC08'.toLowerCase(), '0.000525'],
  ['0x8Db7A537d8478DF3c6D95ff33b4270342862957F'.toLowerCase(), '0.000434'],
  ['0x79C8f728dFB2689C7CB3ADF259744ACf897FE270'.toLowerCase(), '0.000001'],
  ['0x8adcCf4EB88C3cE29f8e16025149939fa33fA25d'.toLowerCase(), '0.000141'],
  ['0x38e481367E0c50f4166AD2A1C9fde0E3c662CFBa'.toLowerCase(), '1.226756'],
  ['0x6aDbD800D5D59065c7780003896d9603a5Da124B'.toLowerCase(), '0.095152'],
  ['0xAffD9F38200A9eDA526dC275599e5E7b8CCc8f20'.toLowerCase(), '87.607686'],
  ['0x8c823c1489Dcf2af7ded0eccdBf81Ff993e1435b'.toLowerCase(), '33.610413'],
  ['0x502dE614A576Add81a7FBb6E87885C7DC9D870D5'.toLowerCase(), '0.004943'],
  ['0x0989eFAFA1f04B58ad66589A97522e5161Ef3FAC'.toLowerCase(), '0.106764'],
  ['0x1751D72599064EeD9FE3eeE1186c952720444525'.toLowerCase(), '2.767422'],
  ['0x262391f82a63eB0f419B99779dB412d124736b27'.toLowerCase(), '0.086504'],
  ['0xCB6222f4Df04385ea08E8DA2A5871131FF5F6cBA'.toLowerCase(), '0.001941'],
  ['0xe4572eED3Ca570BCa0f118466b4F8440C1672ccF'.toLowerCase(), '0.000593'],
  ['0x7215207d7329989A14f4EE02Aa8A0B11801b0E5E'.toLowerCase(), '1.060677'],
  ['0x3838433F63f4d4A24260F2485AACf5894ba7Bc93'.toLowerCase(), '2.417555'],
  ['0x2f69ff6e00CfE0e9dD1da7d6F6Bc745Ea6Cd6aE5'.toLowerCase(), '0.000231'],
  ['0x58f1101f3632f1D0544197351FbdEd673f4b43F1'.toLowerCase(), '0.00063'],
  ['0x4E3288c9ca110bCC82bf38F09A7b425c095d92Bf'.toLowerCase(), '0.243751'],
  ['0x392F8d754e3301bd1CBeac7ea856a146781233dF'.toLowerCase(), '4.156349'],
  ['0x7a80DCb3e09966B540F48d870111Ea21c844a27E'.toLowerCase(), '0.013892'],
  ['0xa04275c10f39E8675a34e147E2EF78d35129f2b6'.toLowerCase(), '0.000293'],
  ['0x1d9a60325CD837f84f42ceE66b3beb09ED29A86b'.toLowerCase(), '0.000299'],
  ['0xFF6bCE61572be700bB450a510A1c0502a7c55cf4'.toLowerCase(), '0.194038'],
  ['0x1111111254EEB25477B68fb85Ed929f73A960582'.toLowerCase(), '0.000001'],
  ['0xE174C7b1E5081f10b7BcA87858073294f28E25Cf'.toLowerCase(), '0.01724'],
  ['0x06D4269FbBFd4774F7B1cbDd9B132d5e0fb52f27'.toLowerCase(), '0.003731'],
  ['0x9fB7Ed50fC5BaCE2E7e1101e8Fd6805c9A678C84'.toLowerCase(), '0.000071'],
  ['0xdF81608A220E0d8711Bb58Ab4a48f977E5fA2C23'.toLowerCase(), '0.000901'],
  ['0x536a465F96BD5Ed7b75076b43206d0287d2d6E84'.toLowerCase(), '0.200393'],
  ['0xb057d918D29EaF7FCAbB54757E1112998F427489'.toLowerCase(), '0.00094'],
  ['0x30F5EBabE646Ba3F8C1ef97C462bAF23699B865f'.toLowerCase(), '0.024188'],
  ['0xb0fFBda923E31018586772B4De0e2A2E4b9D805c'.toLowerCase(), '0.012282'],
  ['0x577BE3eD9A71E1c355f519BBDF5f09Ba2018b1Cc'.toLowerCase(), '0.060826'],
  ['0x20D5F3f40Dd1783D4e1075fc028732D60D2B9Dd6'.toLowerCase(), '0.021318'],
  ['0x88dD694eB900A670734892CA2E89f20dEFE2Ac8c'.toLowerCase(), '0.064785'],
  ['0x11EF981EBd7202B15db301AAB4ADd70Af80FfbE7'.toLowerCase(), '0.000788'],
  ['0xdBDf70689CB64b096C5291843936C56731E8240b'.toLowerCase(), '0.020265'],
  ['0x39069AdD37ea21D3db98E01e8Ad81baCEF739168'.toLowerCase(), '0.0362'],
  ['0x823bf98d9F1119Ae040aaef8118f13A612324112'.toLowerCase(), '2.226351'],
  ['0x6c2693F5a936f37eD03CfA8465bF2D8BEFf19A0f'.toLowerCase(), '22.908415'],
  ['0x208a17c5fABe5B90282e5906945ff335E39326c4'.toLowerCase(), '0.232454'],
  ['0x02736c4D67e0b69D3265f040885E3e40758F0230'.toLowerCase(), '0.04282'],
  ['0x46814CaDf040d7E90531a426b3120cF76269B60c'.toLowerCase(), '0.644849'],
  ['0xF52A98b1DC37a99367F2147B02873c48fa4Afb37'.toLowerCase(), '0.091682'],
  ['0x3cef0d05Ae5Eb9D4C1Eb8618aA3c7c63412d8db3'.toLowerCase(), '2.0044'],
  ['0x62E1af3e818aFc059D111C4F53CF0a2D9Fd29110'.toLowerCase(), '1.690623'],
  ['0x44a03946C8e690c6Ecdb254B3744690A42E1ED17'.toLowerCase(), '0.109481'],
  ['0x49a5492FDFe5AcC966dD5f41310dfDfe8dAA349C'.toLowerCase(), '0.418242'],
  ['0x13108aB5c6eB7efDcD7Ba6F8cc55d265eAE6176F'.toLowerCase(), '0.107923'],
  ['0x35A1a7740653b9c99b9b70C37c1C97192585B6BB'.toLowerCase(), '0.11736'],
  ['0x5275817b74021E97c980E95EdE6bbAc0D0d6f3a2'.toLowerCase(), '1.453745'],
  ['0x69EA3132c39d4ddAA4FCff7304dff1d4C0758FaB'.toLowerCase(), '0.084435'],
  ['0x41F17D85FB4a6025656717894f63e54034b0611d'.toLowerCase(), '0.074525'],
  ['0x8f62b14F9DF54690738945C1140D69CE7bb1895C'.toLowerCase(), '0.087246'],
  ['0x9E0856F5bc0cF904B182E5c6024b6Eaa2928a241'.toLowerCase(), '0.027691'],
  ['0x3e516B6d229Bf935F1B6Bf4A0C2531ddAB48cF1B'.toLowerCase(), '0.141831'],
  ['0xf081470f5C6FBCCF48cC4e5B82Dd926409DcdD67'.toLowerCase(), '0.000001'],
  ['0x8fB20c72139B2A971Ab814503D61111349f8Cc78'.toLowerCase(), '0.127865'],
  ['0xe120Be880D79adEd4cdbf6F2f9Ef880987c82dc8'.toLowerCase(), '0.054508'],
  ['0xF80CACD82b00DA8C669e9f7bbBd80E320A40C8fB'.toLowerCase(), '0.033488'],
  ['0xC4f3E0777A9F5A8bC5c009F13953f6814324a4fF'.toLowerCase(), '0.005463'],
  ['0xa049AFeF83d112F9B9Ac4E9d743C50aD08EBEe01'.toLowerCase(), '0.13754'],
  ['0x6FB2775c1424B5B10bD810bE11f68274264a7E48'.toLowerCase(), '0.001692'],
  ['0xf36F1d40B11BbA720391cbc987e0eeF03107242F'.toLowerCase(), '0.222635'],
  ['0xaF02f27AbF8337Fe8C78E9Dd22AB85B4661ff50D'.toLowerCase(), '0.000262'],
  ['0x5cD53e829c4d8c9389e266794bFa71e108b246b7'.toLowerCase(), '0.002886'],
  ['0x66Aeff517e9e00210c9298E10094F438401D221a'.toLowerCase(), '70.271865'],
  ['0x74e0C5A2C2c35c45c7c8B275af02DD1d17002eff'.toLowerCase(), '0.062987'],
  ['0x83090029C7F7C50B2c365648161C2F9C36bc58BD'.toLowerCase(), '2.060952'],
  ['0xA029f255Af9225CA9411eC49D024b5010dEb6B61'.toLowerCase(), '0.038476'],
  ['0x1E670BB5FEC8d4cEbddC3d2Ad99d68F15210D742'.toLowerCase(), '1.391549'],
  ['0x20313BF6f3071fAe1F44E23f1aED6950030BD1Db'.toLowerCase(), '0.095763'],
  ['0x2d1bdC590Cb736097Bc5577c8974e28dc48F5ECc'.toLowerCase(), '0.043551'],
  ['0x69EBd6A41a0012f8BCfcCdD470D3BF760e8B7b53'.toLowerCase(), '0.00006'],
  ['0x3C69dd995AF7f11f5f6406B96B63B65FD7e3C347'.toLowerCase(), '0.0042'],
  ['0x15B631b0B72C4164f2e1e94c1b294229628e8143'.toLowerCase(), '0.0001'],
  ['0x4A7D7Bdd110730405661947884153552E356Eb4b'.toLowerCase(), '0.0001'],
  ['0x43f5d8e8CBBf7F1043420F44fA528B251c9Cf44D'.toLowerCase(), '0.0001'],
  ['0x8F1d5ae0Ecb144255A35ac8135D643A2be9B25Ff'.toLowerCase(), '0.0001'],
  ['0x68b26823Fc42A6BFD4427777087252296532CcdB'.toLowerCase(), '0.0001'],
  ['0xD0B6D1752F51152558dD9516A8F24d9f8654c951'.toLowerCase(), '0.0002'],
  ['0xE38A5E1c0c97Cf2fAb5a4fe964610CE4DA618272'.toLowerCase(), '0.0001'],
  ['0x2e3873D76b7212191e3d1D509834FCf200CCB0Ec'.toLowerCase(), '0.002167'],
  ['0xEa16545cF2E4C30b38B156CDA0972BE63cE71d50'.toLowerCase(), '0.480081'],
  ['0x7B6BB28AaE4D950bC676Eb40942f1Ae96adBaAc2'.toLowerCase(), '0.000488'],
  ['0xC72e316d149367bABe1234697e390Ed43F77D23E'.toLowerCase(), '0.011617'],
  ['0x78830AdEd41D1C679A164DDBda5cE745506cC387'.toLowerCase(), '478.075691'],
  ['0x3838c954D0629918578847378Ee22e6778473239'.toLowerCase(), '0.081241'],
  ['0xA2451E7404B3e1811Dd06649DFd8f34D1C579Be0'.toLowerCase(), '0.063355'],
  ['0x1E8E4445f7736084A48c3cca4Cf3d148EC6CB3fC'.toLowerCase(), '0.403509'],
  ['0xF5C879fd536b2c26783404481a2711F040d04029'.toLowerCase(), '0.560283'],
  ['0x114f0bbF1318Ac34Be7d75658c98ae5684809887'.toLowerCase(), '0.037266'],
  ['0xcfdbC75a72e630D99b4b45039d2d2770a181313C'.toLowerCase(), '0.108908'],
  ['0x4ec2856be7C8C5caBaA6B2A191F005503C83b926'.toLowerCase(), '0.498749'],
  ['0x7d11ff89c3f570d98365E6375bEb95fa091975eD'.toLowerCase(), '0.11975'],
  ['0x6D1E0084a6910a8803ab7c22483A1a2Db3F1001a'.toLowerCase(), '0.067039'],
  ['0x55c13B8a1Ca1ECaE783B3f854F1D14edfF29Cb79'.toLowerCase(), '0.036609'],
  ['0xb6F5dE39742eeCA134A2B4CdA5ad4f43617e8f65'.toLowerCase(), '0.046604'],
  ['0x2d2E93E993C91E3a5AC336f400Fa4A147629ad6e'.toLowerCase(), '0.036609'],
  ['0x6fCf9BcDF33f5EE834C40c7aF955581f69c47e07'.toLowerCase(), '0.080199'],
  ['0xAf79312EB821871208ac76A80c8E282f8796964e'.toLowerCase(), '0.068458'],
  ['0xffD1d00554Ea254F267d3f73658D6EE69fBdEe52'.toLowerCase(), '0.07091'],
  ['0xbcc181046fd96CCaDF0CEBe30D4Ff67D4373A126'.toLowerCase(), '0.249275'],
  ['0x24db8a0A16Da2812B55AF4d0F3a8ADa8A68A330f'.toLowerCase(), '0.239571'],
  ['0xE0B64Db79E49C0242178D6f2e540620ED650E0a0'.toLowerCase(), '0.062434'],
  ['0x76D25eAa2f8A2E69Db9CE5Ae6A28F7905e995F9B'.toLowerCase(), '0.018878'],
  ['0x27AB111c7348081f404Fd66729fA10A29F6d7bA7'.toLowerCase(), '80.567636'],
  ['0x78d23147E319398fbEbe75232710c88f12540E33'.toLowerCase(), '0.005091'],
  ['0x167D87A906dA361A10061fe42bbe89451c2EE584'.toLowerCase(), '1.46327'],
  ['0xE47fd677BA6D3738Cec98aa18Bb6fa015B6f7bDA'.toLowerCase(), '0.126909'],
  ['0xd412da7894BCe0d470C8919BCa6e27F24d0Cbc3B'.toLowerCase(), '199.961167'],
  ['0x18149E4868e58CA59E151eDf1fE345eCEb7046f7'.toLowerCase(), '0.027553'],
  ['0x65268d4Fb73544b6056fa4f4BF20FC90E0b12a80'.toLowerCase(), '0.000518'],
  ['0xff75D3a2d2fd3f6b2D8DC883Ae21fDC972cf97A3'.toLowerCase(), '0.181622'],
  ['0xCC0269B693A989e17707dfb7Dc0e95FBa5818Bc0'.toLowerCase(), '0.036952'],
  ['0x40143c9a472283CD01657368a68F20cB58dc170B'.toLowerCase(), '0.03962'],
  ['0x4FfDA342DB6366E564b28E98DCbc48890ae204Ac'.toLowerCase(), '0.017931'],
  ['0x1823a77aB4C2d71df270767B65e9a01de8233ed2'.toLowerCase(), '0.081239'],
  ['0x6E81417b312917305d12F76Fa3B6bd66FfAA75e7'.toLowerCase(), '0.542969'],
  ['0x73834E3fDD176791a4A1e73b28b87268EB6Aa18D'.toLowerCase(), '0.000574'],
  ['0xd4912C3e08EdBa5dEa3156Ef56A79716f776a2D9'.toLowerCase(), '0.014508'],
  ['0x502A5fF7D4E4F4C9f01d483b5291eC62eA588A2f'.toLowerCase(), '0.012992'],
  ['0xEB4576fE753DAB07635c0Bb6c8f0A355e1Db5d31'.toLowerCase(), '0.031386'],
  ['0x0Bd27FAc898a59680b9dc92bB7378Df610825E8D'.toLowerCase(), '493.108918'],
  ['0x75A9067Ea179F42644af1F31575EC6ab43496519'.toLowerCase(), '0.015667'],
  ['0xeE28f0e5740ece71ea63C6aFbd82f725243974A3'.toLowerCase(), '4.295139'],
  ['0x98770925C9615026D87a40AE80F62F3Ff6392Ef6'.toLowerCase(), '0.018166'],
  ['0x83bAD39F067EF72e354F2EA9d318EaAD381a7F15'.toLowerCase(), '0.150489'],
  ['0x388b2d29E7919D45b1B8F6e88b8A13a392f97b40'.toLowerCase(), '0.067363'],
  ['0x4F46c9D3257D95e35A2441dF2FdF293Af13F47D9'.toLowerCase(), '0.021073'],
  ['0xDb10d21f28a34FD04E4425eac777483798f7e217'.toLowerCase(), '0.530975'],
  ['0x2E1531c10054b22d2564e020Dc3a95dcC0d940cc'.toLowerCase(), '0.002914'],
  ['0xfB17d5CD85854B6Bee89e714591DE521F3169dE5'.toLowerCase(), '0.152637'],
  ['0x69420cc9b83D641470D0FEa1cBf1A59D7a83Df48'.toLowerCase(), '0.000098'],
  ['0x4cd34f7Ea5412CFDcf382139786B44Eb63617701'.toLowerCase(), '0.098823'],
  ['0x147B8869655Bc09f226955cc676fF78efe240cA8'.toLowerCase(), '0.700351'],
  ['0x8c9d080fca8b8ee7c9B62B1AAe91BEDdc4849fDf'.toLowerCase(), '5.970646'],
  ['0xA21f109c27e7c0B81b02b788Ff07c71F3Bde31e3'.toLowerCase(), '0.581036'],
  ['0xe8a4900BF1f3e498d6069f96158bCc132DBB7B44'.toLowerCase(), '0.010963'],
  ['0xf6f02d6c0a08908dc2B17B0a1E9F6011125D3929'.toLowerCase(), '0.000009'],
  ['0x769162779191B0A513d0D08Db6135a144906c39E'.toLowerCase(), '0.128135'],
  ['0x3ef000Bae3e8105be55F76FDa784fD7d69CFf30e'.toLowerCase(), '0.335611'],
  ['0xAA7A9d80971E58641442774C373C94AaFee87d66'.toLowerCase(), '0.165513'],
  ['0xceD9450c4671b64b27C0614Bea50676115F5B6e7'.toLowerCase(), '0.448137'],
  ['0xc2dc013edD48afDcd7b872D51d55ccd1A7717e28'.toLowerCase(), '0.0009'],
  ['0x88F81B95eaE67461b2D687343D36852F87409a7b'.toLowerCase(), '0.390644'],
  ['0x6a908dFD95C6B6daFbd7De5306149F599cd11817'.toLowerCase(), '0.021577'],
  ['0x839537454e13aFEb1Ad0d1B445aD530c994d26Ba'.toLowerCase(), '0.008301'],
  ['0xB86a352cffE8629266FD0279407ECdDb67E5c328'.toLowerCase(), '0.03422'],
  ['0xc74eDb0675d874A7c9EF1a017640Fab000075eAA'.toLowerCase(), '0.079081'],
  ['0x6Efe85bBcb6a35F4Ec2aa0d4a8DD788fb705E822'.toLowerCase(), '9.233613'],
  ['0x6e52a3F199B9E2dA6F9bCe4A395CB015a0C737d9'.toLowerCase(), '0.017621'],
  ['0xaF0b68A684e2B7961A0B6078e36f43D6E990e54b'.toLowerCase(), '0.001521'],
  ['0x95603220F8245535385037C3Cd9819ebCf818866'.toLowerCase(), '2.247277'],
  ['0xD41C0eC18dF28F6Be6942ADDAB960EB25B4232a3'.toLowerCase(), '0.038224'],
  ['0xC90F00B25393d3468a65D39019adCBc175f6922F'.toLowerCase(), '0.184375'],
  ['0xEFF362810e8a03eC0e87591a45ba5c38b710b4b5'.toLowerCase(), '0.100299'],
  ['0x34Ff77A853A14579d2120Ac08C5e342CEe08AD71'.toLowerCase(), '0.04389'],
  ['0x197F2E1219F92Bf2707A78eCCeae970DCa5Fd5c7'.toLowerCase(), '0.007013'],
  ['0x8fc6F7B80419AbA7659bD24736519F62D5d738A8'.toLowerCase(), '86.697201'],
  ['0x8fD1Fa331182678DA3dc75f6717Ba800e0B27732'.toLowerCase(), '6.195788'],
  ['0xd1643992466bA0ffdbA2E62ae6C41AB4f0A0a7C3'.toLowerCase(), '0.140507'],

])

const HYPERVISOR_BALANCES = new Map<string, string>([
  ['0x71E7D05bE74fF748c45402c06A941c822d756dc5'.toLowerCase(), '0.019999973561760391'],
  ['0xE6Fb2B218385FF1FFbA914775A35c1A121446CEF'.toLowerCase(), '0.203519260764204221'],
  ['0x4b7E5cd5654b8173F7BC393B138A89DCcf85Bcf7'.toLowerCase(), '5207.639428159596766939'],
  ['0xeE28f0e5740ece71ea63C6aFbd82f725243974A3'.toLowerCase(), '391.423545387666906659'],
  ['0x6c2693F5a936f37eD03CfA8465bF2D8BEFf19A0f'.toLowerCase(), '359.481945755798647443'],
  ['0x29991B99815c3A97194445B19145B4b622BFFD28'.toLowerCase(), '2.93160165287558781'],
  ['0x947ebecd725e07baC225363F328De957AA5819b3'.toLowerCase(), '1000.337461850899595896'],
  ['0xF9c97Ba6b1348FA9d07777dB6C2e9A954360E238'.toLowerCase(), '517.150001781172680193'],
  ['0x47D574e85DF71a059Ec442cAd8DeE2224F58b0D8'.toLowerCase(), '54.044327738510592467'],
  ['0xC9e847261Ae6F2776732D0E7EADD0E3CE212b454'.toLowerCase(), '403.377584263362266423'],
  ['0x7617452156F474836604C1a79c79c0627be5fE74'.toLowerCase(), '130.314007099471246386'],
])

const RETRO_POOL_HOLDERS = new Map<string, number[]>([
  ['0x38cc8e2bfe87ba71a0b4c893d5a94fbdcbd5e5ec'.toLowerCase(), [863, 1379, 1380, 1412]],
  ['0xc10ced99f11b84963aa20c30499f1794c1526725'.toLowerCase(), [1604, 1653, 1654, 1658, 1708, 1985, 2357, 2973]],
  ['0x97e388e8819f6b90ceafc36edf51fc12f3e9108f'.toLowerCase(), [1608, 1704]],
  ['0xf5a4d5d1921d0114b456982d077f8d0987255188'.toLowerCase(), [1623, 1707, 1715, 1718, 1856, 1898]],
  ['0x17b1d9a1a8f0363e04bccdf2839cb107b2297774'.toLowerCase(), [1637, 4115, 5897]],
  ['0xb9c0aba138b98656ffea4309bfe2881b0b7c1d96'.toLowerCase(), [1649]],
  ['0xf712ab8c4505eb4b36a2ff9fa746470be81e6538'.toLowerCase(), [1650, 1656, 1717, 1737, 1739, 1869, 1870, 2180, 3456, 4446]],
  ['0x41bc7d0687e6cea57fa26da78379dfdc5627c56d'.toLowerCase(), [1657, 1872, 3217, 3347, 3349, 3369, 3370, 3401, 3402]],
  ['0x193db18a5ef9a0320b7374c1fe8af976235f3211'.toLowerCase(), [1659, 1661, 3201, 3412, 3413, 4260, 5922]],
  ['0xdfb4ddd69b7c0eefcb4085439632cf6d17d55a6b'.toLowerCase(), [1667]],
  ['0x92b2bd9daf8ee1c68bd9df29e186a145684e6f3f'.toLowerCase(), [1675, 1684, 1701, 1734, 4130, 4131]],
  ['0xdeaf42d4a2cc1dc14505ce4e4f59629aec253d75'.toLowerCase(), [1699, 1722]],
  ['0x17c8afd739a175eacf8af5531671b222102b8083'.toLowerCase(), [1716, 1774]],
  ['0x51c1ce246708b2a198f7e7e9dc3d154ee4cd9572'.toLowerCase(), [1735, 1743, 1864, 2296, 3212, 3229, 3365, 4110, 5159, 5423, 5459, 6403]],
  ['0x29f82d09c2afd12f3c10ee49cd713331f4a7228e'.toLowerCase(), [1763, 5871]],
  ['0x0524f2b8765ee3a1a033311ddc9e2dcaad34b8c3'.toLowerCase(), [1770]],
  ['0xf99c8873b972b4192e789f55ab954188d0d9a133'.toLowerCase(), [1793, 2343, 3271, 3421, 3422, 3606, 4218, 5190]],
  ['0x9ce6e6b60c894d1df9bc3d9d6cc969b79fb176b7'.toLowerCase(), [1851, 1852, 1853, 2045, 2310, 2591, 3134, 3168]],
  ['0x96669b041f54338edfc62f8c8de59e6c743bd536'.toLowerCase(), [1861]],
  ['0xf2fc4f6c2ba2e81e4a81dd7366b790d276fdd007'.toLowerCase(), [1865, 3257, 3258]],
  ['0xa5ef9af3729a15479a4ee7b669a20db1a65bfa40'.toLowerCase(), [1866]],
  ['0x20d61737f972eecb0af5f0a85ab358cd083dd56a'.toLowerCase(), [1897, 2096, 2378, 2681, 3211, 3461, 4441, 4539]],
  ['0xf60de76791c2f09995df52aa1c6e2e7dcf1e75d7'.toLowerCase(), [1934, 4124, 4125, 4129, 4132, 4181, 4272, 4276]],
  ['0x07c3830075ae563eb66204a72ea118b00efdd58e'.toLowerCase(), [1996, 1999, 3398, 4163, 4164, 4165, 4248, 4249]],
  ['0x0d374583fb42ac6463b83371c620707535d45633'.toLowerCase(), [2129, 3384]],
  ['0x7754d8b057cc1d2d857d897461dac6c3235b4aae'.toLowerCase(), [2725]],
  ['0xcf1d3ac7ee568dbfcad52a05c5ff31fa4ba0fd23'.toLowerCase(), [3286, 3288]],
  ['0xfdbbfb0fe2986672af97eca0e797d76a0bbf35c9'.toLowerCase(), [3311, 3392, 3393, 3582, 3588, 4169]],
  ['0x021bee9a6ec446d561b7e341b73ba8599f70a1cf'.toLowerCase(), [3380, 3381]],
  ['0xe174c7b1e5081f10b7bca87858073294f28e25cf'.toLowerCase(), [3391]],
  ['0x52076094b0f7b982838518d8b578aeee9176ef60'.toLowerCase(), [3394, 3396]],
  ['0x5e309305799fc40a58d2a0214107fd6c5ac36bee'.toLowerCase(), [3399, 3400, 3614]],
  ['0x06d4269fbbfd4774f7b1cbdd9b132d5e0fb52f27'.toLowerCase(), [3419]],
  ['0x09db89c32d01606ff660d2a72f683526b422bb77'.toLowerCase(), [3428]],
  ['0x63712c2f30f48ff20beb3837578071b70cea9f07'.toLowerCase(), [3444]],
  ['0x4ee0a98041069b745855eef05cfa0046dfcbbd4d'.toLowerCase(), [3447, 3552]],
  ['0xbee2d469aacb46251ae33cca91f482e26c971dff'.toLowerCase(), [3511]],
  ['0x2184d88114f300050841b82d7c344049278d5d82'.toLowerCase(), [3699, 4148, 4187, 4246, 5297]],
  ['0x6c2693f5a936f37ed03cfa8465bf2d8beff19a0f'.toLowerCase(), [3703, 3707, 4101]],
  ['0xa304816c9c78505714f24fc13222fe07ce0cc711'.toLowerCase(), [3883]],
  ['0xf80cacd82b00da8c669e9f7bbbd80e320a40c8fb'.toLowerCase(), [4105, 4106, 4191]],
  ['0xa049afef83d112f9b9ac4e9d743c50ad08ebee01'.toLowerCase(), [4114]],
  ['0x8d82d851e220c5e20ed85340e8e290018c6e59f7'.toLowerCase(), [4119]],
  ['0xe60dabff3e7fa76ed649f6f78c51d6a77729c0b2'.toLowerCase(), [4126, 4134, 4135, 5779, 6034, 6040, 6051]],
  ['0x74e142df816c376bd35d7ae02914fc8168fcd45f'.toLowerCase(), [4141]],
  ['0x13108ab5c6eb7efdcd7ba6f8cc55d265eae6176f'.toLowerCase(), [4142, 4185]],
  ['0xf36f1d40b11bba720391cbc987e0eef03107242f'.toLowerCase(), [4145, 4179, 4208, 4474]],
  ['0xafe6b977fcf3c634cdcd2b324b799b31fb69d708'.toLowerCase(), [4158, 4159, 4160, 4161]],
  ['0xc467bb07d0509494e413b62f4f2797b6826f4ed8'.toLowerCase(), [4190, 5601]],
  ['0xd90d5bf29e01ed2f45125cb99455c290be0dfbed'.toLowerCase(), [4199]],
  ['0x68a0187089e2d1addee1ff35c4b0a7b5988931ea'.toLowerCase(), [4255, 4380, 4382]],
  ['0xcbdc452727a417176e92046061fa1a380d20aae3'.toLowerCase(), [4311]],
  ['0x4229f5429301ab35a079ca91db550d40fc43eb19'.toLowerCase(), [4821]],
  ['0xece1477d3c350a42486d2dc802f6243e99409a41'.toLowerCase(), [5160]],
  ['0x2a724be1b63caec1c3ef95834fdd443c3347ee1d'.toLowerCase(), [5235]],
  ['0x14c49fb42d4aca62f905e3fd4eecba1932f58c90'.toLowerCase(), [5339]],
  ['0x14ae683317d9d27957f56c78e9308e7d54bc3b36'.toLowerCase(), [5401]],
  ['0x3c948a11c4d5462ace49a505ece7112531b16725'.toLowerCase(), [5862]],
  ['0x0bd27fac898a59680b9dc92bb7378df610825e8d'.toLowerCase(), [5866]],
  ['0x44a03946c8e690c6ecdb254b3744690a42e1ed17'.toLowerCase(), [5874]],
  ['0x16ef04260ca959c75bd8d4247874517c9cf74d12'.toLowerCase(), [5904]],
  ['0x72c5cd18a51d53db34072546a7a38a4f73600d92'.toLowerCase(), [5932]],
  ['0x7b3fc8884f69a30bea47013961e06c54fc003ad3'.toLowerCase(), [5984]],
  ['0xc5105f63c5a051c2a900b2893a164cd2f24bff26'.toLowerCase(), [6161, 6164, 6165]],
  ['0x643bb72735e4912bd1a194a1c1517a5dcedbbfa8'.toLowerCase(), [6193]],
  ['0x93d8ea87e2904828d5a5420dcc13d04fbc0473c3'.toLowerCase(), [6270]],
  ['0x47d574e85df71a059ec442cad8dee2224f58b0d8'.toLowerCase(), [6342]],
  ['0x000000000000000000000000000000000000dead'.toLowerCase(), [5225]],
  ['0xe5a99377a4616ae1912bfdfe5840fcf461ac6b7d'.toLowerCase(), [6932]],
  ['0x3db50485076d2bbd81a0c33cf43fdb7c1ec05ab1'.toLowerCase(), [3390]],

])

const RETRO_UNI_POOL_POSITIONS_DATA = {
  "positions": [
    {
      "id": "1380",
      "owner": "0x38cc8e2bfe87ba71a0b4c893d5a94fbdcbd5e5ec"
    },
    {
      "id": "5601",
      "owner": "0xc467bb07d0509494e413b62f4f2797b6826f4ed8"
    },
    {
      "id": "5862",
      "owner": "0x3c948a11c4d5462ace49a505ece7112531b16725"
    },
    {
      "id": "5866",
      "owner": "0x0bd27fac898a59680b9dc92bb7378df610825e8d"
    },
    {
      "id": "5871",
      "owner": "0x29f82d09c2afd12f3c10ee49cd713331f4a7228e"
    },
    {
      "id": "5874",
      "owner": "0x44a03946c8e690c6ecdb254b3744690a42e1ed17"
    },
    {
      "id": "5897",
      "owner": "0x17b1d9a1a8f0363e04bccdf2839cb107b2297774"
    },
    {
      "id": "5922",
      "owner": "0x193db18a5ef9a0320b7374c1fe8af976235f3211"
    },
    {
      "id": "6403",
      "owner": "0x51c1ce246708b2a198f7e7e9dc3d154ee4cd9572"
    },
    {
      "id": "-1", // HYPERVISOR
      "owner": "0x58d9c906D69Ef796271706017D317E84cB8127A8",
    }
  ]
}

const GAMMA_POSITIONS_TICKS = [
  [-886800, 886800,],
  [-600, 600,],
  [275800, 276200,],
  [276600, 276800,],
  [276400, 276600,],
]

// token0 = tUSDC
const RETRO_UNI_POOL_DATA = {
  "liquidity": "2823402734961437548",
  "totalValueLockedToken0": "15228.029951",
  "totalValueLockedToken1": "38234.026938221278083354"
}

const START_BLOCK = 36870060;
const END_BLOCK = 50269407;
const tUSDC = '0x0D397F4515007AE4822703b74b9922508837A04E';
const CASH = '0x5D066D022EDE10eFa2717eD3D79f22F949F8C175';

const BIG_ADDR_NAMES = new Map<string, string>([
  ['0x1a8042DeD3d7B02929a1BEC785a5325B2E89EAd8'.toLowerCase(), 'GnosisSafeProxy'],
  ['0xecF1F56e82C4E225C1f6739cF11D39C378eC1aE4'.toLowerCase(), 'UniswapV3Pool'],
  ['0xfB0a73D2E87c5EC9D4a721f25fD5DA71AbE0a910'.toLowerCase(), 'GnosisSafeProxy'],
  ['0x093CfB323E28bd797224E3b994E3496a0d14660F'.toLowerCase(), 'GnosisSafeProxy'],
  ['0x36Fefa17f0754D814e323358CA18E809e4cD4b12'.toLowerCase(), 'GnosisSafeProxy'],
  ['0xc06a4eb12eB8a7c47a5Bf0cf19A42935CDDEEe75'.toLowerCase(), 'UniswapV3Pool'],
  ['0x4fcdb2dcc4ce156c723ad541dba8b39d47284fc5'.toLowerCase(), 'Retro_UniswapV3Pool'],
  ['0xaC44f57eEF260eB6E0f896b61984Da8d86FeE9ed'.toLowerCase(), 'UniswapV3Pool'],
  ['0x20D61737f972EEcB0aF5f0a85ab358Cd083Dd56a'.toLowerCase(), 'GnosisSafeProxy'],
  ['0x6486CCBF0091f82Bf6a9869AA068b6e707f74097'.toLowerCase(), 'Bribe'],
  ['0xa8a29010ebF4065b9324750eAE523AAF0744f693'.toLowerCase(), 'Pair'],
  ['0x53C49b9308c3DB176d351d7914Cec0Fb5D7f1129'.toLowerCase(), 'UniswapV3Pool'],
  ['0x1751D72599064EeD9FE3eeE1186c952720444525'.toLowerCase(), 'Pair'],
  ['0x7215207d7329989A14f4EE02Aa8A0B11801b0E5E'.toLowerCase(), 'Bribe'],

]);

// ------------------ vault 0x0D397F4515007AE4822703b74b9922508837A04E 429201.370354 417408.860699
// Kyber USDC/USDT 0x792Bcc2f14FdCB9FAf7E12223a564e7459eA4201 155633.393891
// UniV3 USDC/USDT-100 0xCdc5560AB926Dca3d4989bF814469Af3f989Ab2C 91429.600088
// Algebra USDC/USDT 0xA8105284aA9C9A20A2081EEE1ceeF03d9719A5AD 135280.118822
// Kyber USDC/DAI 0xd0Dff2a31516fEDb80824C9B9E2DDcbfeF2C41e2 42483.23066

const TUSDC_TOTAL_SHARES = 417408.860699
const TUSDC_TOTAL_ASSETS = 429201.370354;

const KYBER_USDC_USDT_ASSETS = 155633.393891;
const KYBER_USDC_USDT_TO_COMPENSATE = 149804.15;
const KYBER_USDC_USDT_RATIO = KYBER_USDC_USDT_ASSETS / TUSDC_TOTAL_ASSETS;


const KYBER_USDC_DAI_ASSETS = 42483.23066;
const KYBER_USDC_DAI_TO_COMPENSATE = 41578.53;
const KYBER_USDC_DAI_RATIO = KYBER_USDC_DAI_ASSETS / TUSDC_TOTAL_ASSETS;

const RETRO_UNI3_NFT = '0x8aac493fd8c78536ef193882aeffeaa3e0b8b5c5';
const X_T_USDC_CASH10 = '0x58d9c906D69Ef796271706017D317E84cB8127A8';
const RETRO_UNI_POOL = '0x4FcdB2DCc4Ce156c723aD541dba8B39d47284FC5';

async function prepareRetroPool(tvl: number) {
  // const totalLiq = BigNumber.from(RETRO_UNI_POOL_DATA.liquidity);
  let totalBalance0 = 0;
  const decimals = 6;
  const result = new Map<string, string>();

  const nftUsers = new Map<string, {
    tickLower: number;
    tickUpper: number;
    liquidity: BigNumber;
  }>();

  const usersTicks = new Map<string, string[]>();


  for (const pos of RETRO_UNI_POOL_POSITIONS_DATA.positions) {

    if (+pos.id > 0) {
      const info = await IPositionManager__factory.connect(RETRO_UNI3_NFT, ethers.provider).positions(pos.id, {blockTag: END_BLOCK});

      if (info.liquidity.isZero()) {
        throw new Error('Liquidity is zero for position ' + pos.id);
      }

      nftUsers.set(pos.owner.toLowerCase(), {
        tickLower: info.tickLower,
        tickUpper: info.tickUpper,
        liquidity: info.liquidity,
      });

      const tickKey = `${info.tickLower}_${info.tickUpper}`;

      const arr = usersTicks.get(tickKey) ?? [];
      arr.push(pos.owner.toLowerCase());
      usersTicks.set(tickKey, arr);

      // const bal0 = formatUnits(await collectUni3BalanceByTicks(
      //   RETRO_UNI3_NFT,
      //   [[info.tickLower, info.tickUpper]],
      // ), decimals);
      //
      // result.set(pos.owner.toLowerCase(), bal0);
      // totalBalance0 += +bal0;
    } else {
      // collect hypervisor


      const sharesTUSDCPart = +formatUnits(await collectUni3BalanceByTicks('0x58d9c906D69Ef796271706017D317E84cB8127A8', GAMMA_POSITIONS_TICKS), decimals);
      totalBalance0 += sharesTUSDCPart;

      const hPoses = await collectHypervisorAllocs(sharesTUSDCPart);

      for (const [address, amount] of hPoses) {
        result.set(address.toLowerCase(), amount.toString());
        // console.log('Hypervisor', address, amount.toString());
      }
    }
  }

  // collect info for nftUsers
  for (const [tickKey, users] of usersTicks) {
    const [tickLower, tickUpper] = tickKey.split('_').map(Number);
    const bal0 = formatUnits(await collectUni3BalanceByTicks(
      RETRO_UNI3_NFT,
      [[tickLower, tickUpper]],
    ), decimals);

    const key = ethers.utils.solidityKeccak256(['address', 'int24', 'int24'], [RETRO_UNI3_NFT, tickLower, tickUpper]);
    const pos = await IUni3Pool__factory.connect(RETRO_UNI_POOL, ethers.provider).positions(key, {blockTag: END_BLOCK});

    const nftUsersFiltered = new Map<string, {
      tickLower: number;
      tickUpper: number;
      liquidity: BigNumber;
      ratio: number;
    }>();
    let usersLiq = BigNumber.from(0);

    for (const address of users) {
      const info = nftUsers.get(address.toLowerCase());
      if (!info) {
        console.log('No info for user', address);
        throw new Error('No info for user');
      }

      if (info.tickLower === tickLower && info.tickUpper === tickUpper) {

        const ratio = +formatUnits(info.liquidity, decimals) / +formatUnits(pos._liquidity, decimals);

        nftUsersFiltered.set(address, {
          ...info,
          ratio,
        });
        usersLiq = usersLiq.add(info.liquidity);
      } else {
        console.log('Tick not match', info.tickLower, info.tickUpper, tickLower, tickUpper);
        throw new Error('Tick not match');
      }
    }

    if (!pos._liquidity.eq(usersLiq)) {
      console.log('Liquidity not match', pos._liquidity.toString(), usersLiq.toString(), users);
      throw new Error('Liquidity not match');
    }

    for (const [address, info] of nftUsersFiltered) {
      const amount = +bal0 * info.ratio;
      result.set(address.toLowerCase(), amount.toString());
    }

    totalBalance0 += +bal0;
  }


  // if (totalBalance0 !== tvl) {
  //   console.log('Total balance', totalBalance0, tvl);
  //   throw new Error('Total balance not match');
  // }

  return result;
}

async function collectAllERC20Holders(token: string) {
  const symbol = await ERC20__factory.connect(token, ethers.provider).symbol();
  console.log('start collection for ', symbol);

  const event = ERC20__factory.createInterface().getEvent('Transfer')
  const topic = ERC20__factory.createInterface().getEventTopic('Transfer')

  const decimals = await ERC20__factory.connect(token, ethers.provider).decimals();

  const logs = await Web3Utils.parseLogs([token], [topic], START_BLOCK, END_BLOCK);

  const holders = new Map<string, BigNumber>();

  for (const log of logs) {

    const transfer = ERC20__factory.createInterface().decodeEventLog(event, log.data, log.topics)

    // if the transfer is to the holder, add it to their balance; if the transfer is from the holder, subtract it
    if (holders.has(transfer.to)) {
      holders.set(transfer.to, (holders.get(transfer.to) ?? BigNumber.from(0)).add(transfer.value));
    } else {
      holders.set(transfer.to, transfer.value);
    }

    if (holders.has(transfer.from)) {
      holders.set(transfer.from, (holders.get(transfer.from) ?? BigNumber.from(0)).sub(transfer.value));
    } else {
      holders.set(transfer.from, BigNumber.from(0));
    }

    console.log(`Holder: ${transfer.from}: ${formatUnits((holders.get(transfer.from) ?? BigNumber.from(0)).toString(), decimals)}`);
    console.log(`Holder: ${transfer.to}: ${formatUnits((holders.get(transfer.to) ?? BigNumber.from(0)).toString(), decimals)}`);

    // const block = await ethers.provider.getBlock(log.blockNumber)
    console.log('block', log.blockNumber,
      `Holder from: ${transfer.from}: ${formatUnits((holders.get(transfer.from) ?? BigNumber.from(0)).toString(), decimals)}`,
      `Holder to: ${transfer.to}: ${formatUnits((holders.get(transfer.to) ?? BigNumber.from(0)).toString(), decimals)}`
    );
    // if (block.timestamp > END_TIME) {
    //   break;
    // }
  }

  let out = ''
  console.log(symbol, 'Holders:');
  let sum = 0

  const allHolders = new Map<string, string>();

  for (const [holder, balance] of holders) {
    if (balance.isZero() || holder.toLowerCase() === Misc.ZERO_ADDRESS) {
      continue;
    }

    const realBalance = await ERC20__factory.connect(token, ethers.provider).balanceOf(holder, {blockTag: END_BLOCK});

    if (!realBalance.eq(balance)) {
      console.log('Real balance', holder, formatUnits(realBalance, decimals), formatUnits(balance, decimals));
    }

    sum += (+formatUnits(balance, decimals));


    // console.log(holder, formatUnits(balance.toString()));

    out += `${holder} ${formatUnits(balance.toString(), decimals)}\n`
    allHolders.set(holder.toLowerCase(), formatUnits(balance.toString(), decimals));
  }


  console.log(symbol, 'Total:', sum);

  writeFileSync(`./tmp/${symbol}_holders.txt`, out, 'utf8');

  return allHolders;
}

async function collectHypervisorAllocs(shares: number) {
  const hypervisor = IHypervisor__factory.connect(X_T_USDC_CASH10, ethers.provider);

  const hPos = await hypervisor.getTotalAmounts({blockTag: END_BLOCK})

  // console.log('hPos tUSDC', formatUnits(hPos[0], 6));
  // console.log('hPos CACH', formatUnits(hPos[1], 18));

  let totalHBal = 0;
  for (const [address, amount] of HYPERVISOR_BALANCES) {
    totalHBal += Number(amount);
  }


  const hTUSDCBal = +formatUnits(hPos[0], 6);
  const hRatios = new Map<string, number>();
  for (const [address, amount] of HYPERVISOR_BALANCES) {
    // console.log('hPos', address, amount, Number(amount) / totalHBal, Number(amount) / totalHBal * hTUSDCBal);
    hRatios.set(address, Number(amount) / totalHBal);
  }

  // const allLiq = +formatUnits((await hypervisor.getBasePosition({blockTag: END_BLOCK})).liquidity);
  const allocs = new Map<string, number>();
  for (const [address, ratio] of hRatios) {
    allocs.set(address, ratio * shares);
  }

  return allocs;
}

async function collectHypervisorLiq() {
  const hypervisor = IHypervisor__factory.connect(X_T_USDC_CASH10, ethers.provider);

  const base = await hypervisor.getBasePosition({blockTag: END_BLOCK});

  console.log('base', base.liquidity.toString(), base.amount0.toString(), base.amount1.toString());
  return base.liquidity;
}

async function collectNFTHolders(nft: string, check: (tokenId: number, block: number) => Promise<boolean>) {
  const symbol = await ERC721__factory.connect(nft, ethers.provider).symbol();
  console.log('start collection for ', symbol);

  const event = ERC721__factory.createInterface().getEvent('Transfer')
  const topic = ERC721__factory.createInterface().getEventTopic('Transfer')

  const logs = await Web3Utils.parseLogs([nft], [topic], START_BLOCK, END_BLOCK);

  const holders = new Map<string, number[]>();

  for (const log of logs) {

    const transfer = ERC721__factory.createInterface().decodeEventLog(event, log.data, log.topics)

    const from = transfer.from.toLowerCase();
    const to = transfer.to.toLowerCase();
    const tokenId = Number(transfer.tokenId.toString());

    if (!(await check(tokenId, log.blockNumber))) {
      continue;
    }

    const arrTo = holders.get(to) ?? [];
    arrTo.push(tokenId);
    holders.set(to, arrTo);

    const arrFrom = holders.get(from) ?? [];
    if (arrFrom.indexOf(tokenId) !== -1) {
      arrFrom.splice(arrFrom.indexOf(tokenId), 1);
    }
    holders.set(from, arrFrom);
  }

  let out = ''
  console.log(symbol, 'Holders:');

  const allHolders = new Map<string, number[]>();

  for (const [holder, balance] of holders) {
    if (balance.length === 0 || holder.toLowerCase() === Misc.ZERO_ADDRESS) {
      continue;
    }

    const realBalance = await ERC20__factory.connect(nft, ethers.provider).balanceOf(holder, {blockTag: END_BLOCK});

    if (!realBalance.eq(balance.length)) {
      console.log('Real balance', holder, realBalance, balance.length, balance);
    }

    // console.log(holder, formatUnits(balance.toString()));

    out += `${holder} ${balance.toString()}\n`
    allHolders.set(holder.toLowerCase(), balance);
  }

  writeFileSync(`./tmp/${symbol}_holders.txt`, out, 'utf8');

  return allHolders;
}

async function checkUni3Nft(posManager: string, tokenId: number, block: number, expectedToken: string) {
  try {
    console.log('check id', tokenId);
    const pos = await IPositionManager__factory.connect(posManager, ethers.provider).positions(tokenId, {blockTag: block});

    return pos.token0.toLowerCase() === expectedToken.toLowerCase() || pos.token1.toLowerCase() === expectedToken.toLowerCase();
  } catch (e) {
    console.error('can not get pos info', tokenId);
    return true;
  }
}

async function collectRetroPoolBalances(poolBalance: number) {

  const allLiq = new Map<string, BigNumber>();
  let liqSum = BigNumber.from(0);
  for (const [address, tokenIds] of RETRO_POOL_HOLDERS) {
    for (const tokenId of tokenIds) {
      const pos = await IPositionManager__factory.connect(RETRO_UNI3_NFT, ethers.provider).positions(tokenId, {blockTag: END_BLOCK});
      // console.log('RETRO pos', tokenId, pos.token0, pos.token1, pos.fee, pos.liquidity.toString());

      if (pos.token0.toLowerCase() === tUSDC.toLowerCase() && pos.token1.toLowerCase() === CASH.toLowerCase() && pos.fee === 10000) {
        const amount = allLiq.get(address.toLowerCase()) ?? BigNumber.from(0);
        allLiq.set(address.toLowerCase(), amount.add(pos.liquidity));
        liqSum = liqSum.add(pos.liquidity)
      }
    }
  }

  const realLiq = await IUni3Pool__factory.connect(RETRO_UNI_POOL, ethers.provider).liquidity({blockTag: END_BLOCK});
  console.log('RETRO realLiq', realLiq.toString(), liqSum.toString(), 'diff:', realLiq.sub(liqSum).toString());
  if (!realLiq.eq(liqSum)) {
    throw new Error('Wrong liq sum');
  }

  const holders = new Map<string, string>();
  let sum = 0;
  for (const [address, amount] of allLiq) {
    const val = Number(formatUnits(amount, 18)) / Number(formatUnits(liqSum, 18)) * poolBalance;
    if (val === 0) {
      continue;
    }
    sum += val;
    holders.set(address, val.toString());
    console.log('RETRO amount', address, val);
  }
  console.log('RETRO sum', sum);

  return holders;
}

async function collectUni3PoolPositionsLiq(pool: string) {
  console.log('start collection for ', pool);

  const event = IUni3Pool__factory.createInterface().getEvent('Mint')
  const topic = IUni3Pool__factory.createInterface().getEventTopic('Mint')


  const logs = await Web3Utils.parseLogs([pool], [topic], 46295394, END_BLOCK);

  const pos = new Map<string, number[][]>();

  for (const log of logs) {

    const mint = IUni3Pool__factory.createInterface().decodeEventLog(event, log.data, log.topics)

    const owner = mint.owner.toLowerCase();
    const tickLower = Number(mint.tickLower.toString())
    const tickUpper = Number(mint.tickUpper.toString())

    const arr = pos.get(owner) ?? [];
    if (!arr.some(p => p[0] === tickLower && p[1] === tickUpper)) {
      arr.push([Number(mint.tickLower.toString()), Number(mint.tickUpper.toString()),]);
    }
    pos.set(owner, arr);
  }

  let out = ''

  for (const [owner, positions] of pos) {
    console.log(owner, positions);
    out += `${owner} ${positions}\n`
  }

  writeFileSync(`./tmp/UNI3_pos.txt`, out, 'utf8');

  return pos;
}

async function collectUni3BalanceByTicks(owner: string, ticks: number[][]) {
  const calculator = Uni3LiqCalc__factory.connect('0xbE9502dF79b81F53A2DB48FD21D23d5Fc145897D', ethers.provider);

  const slot0 = await IUni3Pool__factory.connect(RETRO_UNI_POOL, ethers.provider).slot0({blockTag: END_BLOCK});

  let sum = BigNumber.from(0);
  for (const tick of ticks) {
    const key = ethers.utils.solidityKeccak256(['address', 'int24', 'int24'], [owner, tick[0], tick[1]]);
    const pos = await IUni3Pool__factory.connect(RETRO_UNI_POOL, ethers.provider).positions(key, {blockTag: END_BLOCK});

    // pure function is fine call on any block
    const amount01 = await calculator.amountsForLiquidity(
      slot0.sqrtPriceX96,
      tick[0],
      tick[1],
      pos._liquidity
    );

    // console.log('tick', tick, pos._liquidity.toString(), amount01[0].toString());

    sum = sum.add(amount01[0])
  }
  // console.log('sum', sum.toString());
  return sum;
}

async function collectRetroPoolShareBalances(poolBalance: number) {

  const allLiq = new Map<string, BigNumber>();
  let liqSum = BigNumber.from(0);
  for (const [address, tokenIds] of RETRO_POOL_HOLDERS) {
    for (const tokenId of tokenIds) {
      const pos = await IPositionManager__factory.connect(RETRO_UNI3_NFT, ethers.provider).positions(tokenId, {blockTag: END_BLOCK});
      // console.log('RETRO pos', tokenId, pos.token0, pos.token1, pos.fee, pos.liquidity.toString());

      if (pos.token0.toLowerCase() === tUSDC.toLowerCase() && pos.token1.toLowerCase() === CASH.toLowerCase() && pos.fee === 10000) {
        const amount = allLiq.get(address.toLowerCase()) ?? BigNumber.from(0);
        allLiq.set(address.toLowerCase(), amount.add(pos.liquidity));
        liqSum = liqSum.add(pos.liquidity)
      }
    }
  }

  const realLiq = await IUni3Pool__factory.connect(RETRO_UNI_POOL, ethers.provider).liquidity({blockTag: END_BLOCK});
  console.log('RETRO realLiq', realLiq.toString(), liqSum.toString(), 'diff:', realLiq.sub(liqSum).toString());
  if (!realLiq.eq(liqSum)) {
    throw new Error('Wrong liq sum');
  }

  const holders = new Map<string, string>();
  let sum = 0;
  for (const [address, amount] of allLiq) {
    const val = Number(formatUnits(amount, 18)) / Number(formatUnits(liqSum, 18)) * poolBalance;
    if (val === 0) {
      continue;
    }
    sum += val;
    holders.set(address, val.toString());
    console.log('RETRO amount', address, val);
  }
  console.log('RETRO sum', sum);

  return holders;
}

async function main() {

  // const allHolders = await collectAllUsers();
  // const allHoldersHypervisor = await collectAllUsersHyperVisor();
  const allHolders = ALL_HOLDERS;
  const retroData = await prepareRetroPool(14829.169482);

  for (const [address, amount] of retroData) {
    if (allHolders.has(address)) {
      // console.error('Duplicate', address, amount, allHolders.get(address));
      allHolders.set(address, (Number(amount) + Number(allHolders.get(address))).toString());
    } else {
      allHolders.set(address, amount);
    }
  }

  let totalAmount = 0;
  let skippedAmount = 0;
  let toCompensateSum = 0;
  for (const [address, amount] of allHolders) {
    if (Number(amount) < 1) {
      skippedAmount += Number(amount);
      continue;
    }

    const name = BIG_ADDR_NAMES.get(address.toLowerCase()) ?? 'UNKNOWN_CONTRACT';

    if (name === 'Retro_UniswapV3Pool') {
      continue;
    }

    if (name !== 'GnosisSafeProxy' && (await ethers.provider.getCode(address)) !== '0x') {
      if (Number(amount) < 100) {
        skippedAmount += Number(amount);
        continue;
      }

      console.log(address, amount, name);
      throw new Error('Unknown contract');
    } else {

      // const toCompensateUsdcUsdt = Number(amount) / TUSDC_TOTAL_SHARES * KYBER_USDC_USDT_TO_COMPENSATE;
      const toCompensateUsdcDai = Number(amount) / TUSDC_TOTAL_SHARES * KYBER_USDC_DAI_TO_COMPENSATE;

      console.log('toCompensate', address, toCompensateUsdcDai,);
      toCompensateSum += toCompensateUsdcDai;
    }

    totalAmount += Number(amount);
  }


  const ratio = Number(skippedAmount) / TUSDC_TOTAL_SHARES;

  // const a = ratio * KYBER_USDC_USDT_TO_COMPENSATE;
  const a = ratio * KYBER_USDC_DAI_TO_COMPENSATE;

  console.log('toCompensate_skipped', '0x6672A074B98A7585A8549356F97dB02f9416849E', a,);
  toCompensateSum += a;

  console.log('toCompensateSum', toCompensateSum,);
  console.log('totalAmount', totalAmount,);
  console.log('skippedAmount', skippedAmount,);

}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
