import {ethers} from "hardhat";
import {BigNumber} from "ethers";
import {formatUnits} from "ethers/lib/utils";
import {writeFileSync} from "fs";
import {Web3Utils} from "./utils/tools/Web3Utils";
import {ERC20__factory} from "../typechain";
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

const RETRO_UNI_POOL_POSITIONS_DATA = {
  "positions": [
    {
      "owner": "0x38cc8e2bfe87ba71a0b4c893d5a94fbdcbd5e5ec",
      "liquidity": "6834886923019"
    },
    {
      "owner": "0xc467bb07d0509494e413b62f4f2797b6826f4ed8",
      "liquidity": "124753366630737544"
    },
    {
      "owner": "0x3c948a11c4d5462ace49a505ece7112531b16725",
      "liquidity": "991232258390033542"
    },
    {
      "owner": "0x0bd27fac898a59680b9dc92bb7378df610825e8d",
      "liquidity": "445135693582915782"
    },
    {
      "owner": "0x29f82d09c2afd12f3c10ee49cd713331f4a7228e",
      "liquidity": "120653563894495710"
    },
    {
      "owner": "0x44a03946c8e690c6ecdb254b3744690a42e1ed17",
      "liquidity": "244069597577893853"
    },
    {
      "owner": "0x17b1d9a1a8f0363e04bccdf2839cb107b2297774",
      "liquidity": "43865373966568208"
    },
    {
      "owner": "0x193db18a5ef9a0320b7374c1fe8af976235f3211",
      "liquidity": "19244561585089023"
    },
    {
      "owner": "0x51c1ce246708b2a198f7e7e9dc3d154ee4cd9572",
      "liquidity": "133230336468083080"
    }
  ]
}

// token0 = tUSDC
const RETRO_UNI_POOL_DATA = {
  "liquidity": "2823402734961437548",
  "totalValueLockedToken0": "15228.029951",
  "totalValueLockedToken1": "38234.026938221278083354"
}

const START_BLOCK = 36870060;
const END_BLOCK = 50269407;
const tUSDC = '0x0D397F4515007AE4822703b74b9922508837A04E';

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

async function main() {
  // const allHolders = await collectAllUsers();
  const allHolders = ALL_HOLDERS;
  const retroData = prepareRetroPool(14829.169482);

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

      console.log('toCompensateUsdcDai', address, toCompensateUsdcDai,);
      toCompensateSum += toCompensateUsdcDai;
    }

    totalAmount += Number(amount);
  }

  console.log('totalAmount', totalAmount,);
  console.log('skippedAmount', skippedAmount,);


  const ratio = Number(skippedAmount) / TUSDC_TOTAL_SHARES;

  // const a = ratio * KYBER_USDC_USDT_TO_COMPENSATE;
  const a = ratio * KYBER_USDC_DAI_TO_COMPENSATE;

  console.log('toCompensate_slipped', '0x6672A074B98A7585A8549356F97dB02f9416849E', a,);
  toCompensateSum += a;

  console.log('toCompensateSum', toCompensateSum,);

}

function prepareRetroPool(tvl: number) {
  // const totalLiq = BigNumber.from(RETRO_UNI_POOL_DATA.liquidity);
  let totalLiq = 0;

  const result = new Map<string, string>();
  for (const pos of RETRO_UNI_POOL_POSITIONS_DATA.positions) {
    totalLiq += +(pos.liquidity);
  }
  for (const pos of RETRO_UNI_POOL_POSITIONS_DATA.positions) {
    const liq = +(pos.liquidity);
    const percent = liq / totalLiq;
    const usdcPart = tvl * percent;

    // console.log('RETRO', pos.owner, percent.toFixed(4), usdcPart);
    result.set(pos.owner.toLowerCase(), usdcPart.toString());
  }

  return result;
}

async function collectAllUsers() {
  const event = ERC20__factory.createInterface().getEvent('Transfer')
  const topic = ERC20__factory.createInterface().getEventTopic('Transfer')
  const curBlock = await ethers.provider.getBlockNumber();

  const decimals = await ERC20__factory.connect(tUSDC, ethers.provider).decimals();

  const logs = await Web3Utils.parseLogs([tUSDC], [topic], START_BLOCK, END_BLOCK);

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
  console.log('Holders:');
  let sum = 0

  const allHolders = new Map<string, string>();

  for (const [holder, balance] of holders) {
    if (balance.isZero() || holder.toLowerCase() === Misc.ZERO_ADDRESS) {
      continue;
    }

    const realBalance = await ERC20__factory.connect(tUSDC, ethers.provider).balanceOf(holder, {blockTag: END_BLOCK});

    if (!realBalance.eq(balance)) {
      console.log('Real balance', holder, formatUnits(realBalance, decimals), formatUnits(balance, decimals));
    }

    sum += (+formatUnits(balance, decimals));


    // console.log(holder, formatUnits(balance.toString()));

    out += `${holder} ${formatUnits(balance.toString(), decimals)}\n`
    allHolders.set(holder.toLowerCase(), formatUnits(balance.toString(), decimals));
  }


  console.log('Total:', sum);

  writeFileSync('./tmp/tUSDC_holders.txt', out, 'utf8');

  return allHolders;
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
