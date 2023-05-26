const { ethers } = require("hardhat");
const { parseEther, Interface } = ethers.utils;
require("chai").should();

describe("Use Voucher and Borrower", async () => {
  const userManagerAddress = "0x8E195D65b9932185Fcc76dB5144534e0f3597628";
  const daiAddress = "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1";
  const unionAddress = "0xB025ee78b54B5348BD638Fe4a6D77Ec2F813f4f9";
  const uTokenAddress = "0xE478b5e7A423d7CDb224692d0a816CA146A744b2";
  const marketRegistryAddress = "0x6d44E3b49a6e85Cc316Ef19B423e84A63F7c6D0C";
  const admin = "0x652abfa76d8adf89560f110322fc63156c5ae5c8"; // opOwner admin
  const opOwner = "0x946A2C918F3D928B918C01D813644f27Bcd29D96"; //address has usermanager auth
  const daiWallet = "0x7b7b957c284c2c227c980d6e2f804311947b84d0"; //account has dai
  const unionWallet = "0x8369eebdba09308c7df44b00d6595e30bd55b976"; //account has unionToken
  let voucherContract,
    borrowerContract,
    userManager,
    dai,
    unionToken,
    uToken,
    opOwnerContract;
  before(async () => {
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            jsonRpcUrl:
              "https://opt-mainnet.g.alchemy.com/v2/" +
              process.env.ALCHEMY_API_KEY,
            blockNumber: 101606899,
          },
        },
      ],
    });
    [OWNER, STAKER_A, STAKER_B, STAKER_C, USER] = await ethers.getSigners();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [admin],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [daiWallet],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [unionWallet],
    });
    const signer = await ethers.provider.getSigner(OWNER.address);
    const adminSigner = await ethers.provider.getSigner(admin);
    const daiSigner = await ethers.provider.getSigner(daiWallet);
    const unionSigner = await ethers.provider.getSigner(unionWallet);
    await OWNER.sendTransaction({
      to: admin,
      value: parseEther("10"),
    });
    await OWNER.sendTransaction({
      to: unionWallet,
      value: parseEther("10"),
    });

    opOwnerContract = await ethers.getContractAt("IOpOwner", opOwner);
    userManager = await ethers.getContractAt(
      "IUserManager",
      userManagerAddress
    );
    dai = await ethers.getContractAt("IERC20", daiAddress);
    unionToken = await ethers.getContractAt("IUnionToken", unionAddress);
    uToken = await ethers.getContractAt("IUToken", uTokenAddress);
    await opOwnerContract.connect(adminSigner).setPendingAdmin(OWNER.address);
    await opOwnerContract.connect(signer).acceptAdmin();
    const iface = new Interface([`function setPendingAdmin(address) external`]);
    const encoded = iface.encodeFunctionData("setPendingAdmin(address)", [
      OWNER.address,
    ]);
    await opOwnerContract
      .connect(signer)
      .execute(userManagerAddress, 0, encoded);
    await userManager.connect(signer).acceptAdmin();
    await opOwnerContract.connect(signer).execute(uTokenAddress, 0, encoded);
    await uToken.connect(signer).acceptAdmin();
    const iface2 = new Interface([
      `function transferOwnership(address) external`,
    ]);
    const encoded2 = iface2.encodeFunctionData("transferOwnership(address)", [
      OWNER.address,
    ]);
    await opOwnerContract.connect(signer).execute(unionAddress, 0, encoded2);

    const ExampleVoucher = await ethers.getContractFactory("ExampleVoucher");
    const ExampleBorrower = await ethers.getContractFactory("ExampleBorrower");
    voucherContract = await ExampleVoucher.deploy(
      marketRegistryAddress,
      unionAddress,
      daiAddress
    );
    borrowerContract = await ExampleBorrower.deploy(
      marketRegistryAddress,
      unionAddress,
      daiAddress
    );
    const amount = parseEther("1000");
    await userManager.connect(signer).addMember(STAKER_A.address);
    await userManager.connect(signer).addMember(STAKER_B.address);
    await userManager.connect(signer).addMember(STAKER_C.address);
    await dai.connect(daiSigner).transfer(STAKER_A.address, amount);
    await dai.connect(daiSigner).transfer(STAKER_B.address, amount);
    await dai.connect(daiSigner).transfer(STAKER_C.address, amount);
    await dai.connect(daiSigner).transfer(OWNER.address, amount);
    await dai.connect(STAKER_A).approve(userManager.address, amount);
    await dai.connect(STAKER_B).approve(userManager.address, amount);
    await dai.connect(STAKER_C).approve(userManager.address, amount);
    await userManager.connect(STAKER_A).stake(amount);
    await userManager.connect(STAKER_B).stake(amount);
    await userManager.connect(STAKER_C).stake(amount);
    await userManager
      .connect(STAKER_A)
      .updateTrust(voucherContract.address, amount);
    await userManager
      .connect(STAKER_B)
      .updateTrust(voucherContract.address, amount);
    await userManager
      .connect(STAKER_C)
      .updateTrust(voucherContract.address, amount);
    await userManager
      .connect(STAKER_A)
      .updateTrust(borrowerContract.address, amount);
    await userManager
      .connect(STAKER_B)
      .updateTrust(borrowerContract.address, amount);
    await userManager
      .connect(STAKER_C)
      .updateTrust(borrowerContract.address, amount);
    await unionToken.connect(signer).disableWhitelist();
    const fee = await userManager.newMemberFee();
    await unionToken.connect(unionSigner).transfer(OWNER.address, fee.mul(2));
    await unionToken.connect(OWNER).approve(voucherContract.address, fee);
    await unionToken.connect(OWNER).approve(borrowerContract.address, fee);
  });

  it("register member", async () => {
    let isMember = await voucherContract.isMember();
    isMember.should.eq(false);
    await voucherContract.registerMember();
    isMember = await voucherContract.isMember();
    isMember.should.eq(true);

    isMember = await borrowerContract.isMember();
    isMember.should.eq(false);
    await borrowerContract.registerMember();
    isMember = await borrowerContract.isMember();
    isMember.should.eq(true);
  });

  it("stake and unstake", async () => {
    const amount = parseEther("100");
    let stakeBalance = await voucherContract.getStakerBalance();
    stakeBalance.toString().should.eq("0");
    await dai.approve(voucherContract.address, amount);
    await voucherContract.stake(amount);
    stakeBalance = await voucherContract.getStakerBalance();
    stakeBalance.toString().should.eq(amount.toString());
    await voucherContract.unstake(amount);
    stakeBalance = await voucherContract.getStakerBalance();
    stakeBalance.toString().should.eq("0");

    await dai.approve(voucherContract.address, amount);
    await voucherContract.stake(amount);
  });

  it("withdraw rewards", async () => {
    const balanceBefore = await unionToken.balanceOf(OWNER.address);
    await voucherContract.withdrawRewards();
    const balanceAfter = await unionToken.balanceOf(OWNER.address);
    balanceAfter.toNumber().should.above(balanceBefore.toNumber());
  });

  it("update trust and cancel", async () => {
    const amount = parseEther("100");
    let vouchAmount = await userManager.getVouchingAmount(
      voucherContract.address,
      USER.address
    );
    vouchAmount.toString().should.eq("0");
    await voucherContract.updateTrust(USER.address, amount);
    vouchAmount = await userManager.getVouchingAmount(
      voucherContract.address,
      USER.address
    );
    vouchAmount.toString().should.eq(amount.toString());

    await voucherContract.cancelVouch(voucherContract.address, USER.address);
    vouchAmount = await userManager.getVouchingAmount(
      voucherContract.address,
      USER.address
    );
    vouchAmount.toString().should.eq("0");
  });

  it("mint and redeem", async () => {
    const amount = parseEther("100");
    let balance = await uToken.balanceOf(borrowerContract.address);
    balance.toString().should.eq("0");
    await dai.approve(borrowerContract.address, amount);
    await borrowerContract.mint(amount);
    balance = await uToken.balanceOf(borrowerContract.address);
    balance.toString().should.eq(amount.toString());
    await borrowerContract.redeem(amount);
    balance = await uToken.balanceOf(borrowerContract.address);
    balance.toString().should.eq("0");
  });

  it("borrow and repay", async () => {
    const amount = parseEther("100");
    await borrowerContract.borrow(amount);
    const fee = await uToken.calculatingFee(amount);
    let borrow = await borrowerContract.borrowBalanceView();

    parseFloat(borrow).should.eq(parseFloat(amount.add(fee)));
    await dai.approve(borrowerContract.address, ethers.constants.MaxUint256);
    // repay principal
    await borrowerContract.repayBorrow(amount);
    borrow = await borrowerContract.borrowBalanceView();
    parseFloat(borrow).should.above(parseFloat(fee));
  });
});
