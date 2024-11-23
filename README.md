# Pacioli.ai-Core-V1-Smart-Contracts

V1 of smart contract for reward distribution and claiming.

## Requirements

- NodeJS (version we used it v20.17.0).

## How to run tests?

1. To install all the necessary dependencies, run:

```bash
npm install
```

2. Then set up your .env file:

```bash
ALCHEMY_API_KEY=
COINMARKETCAP_API_KEY=
ETHERSCAN_API_KEY=
REPORT_GAS=false
OWNER=
PRIVATE_KEY=
```

Currently, the price in USD does not get reported.
It is not a coinmarketcap issue, since when curled, it returns current POL/USD ratio.
So it's probably an issue of Hardhat and Polygon interaction.

3. Finally, run the tests with the following command:

```bash
npx hardhat test
```
