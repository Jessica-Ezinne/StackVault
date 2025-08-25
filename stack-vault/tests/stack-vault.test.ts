
import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

const contractName = "stack-vault";

describe("StackVault Contract Tests", () => {
  describe("Contract Initialization", () => {
    it("ensures simnet is well initialised", () => {
      expect(simnet.blockHeight).toBeDefined();
    });

    it("should initialize with correct default values", () => {
      const { result } = simnet.callReadOnlyFn(contractName, "get-platform-stats", [], deployer);
      expect(result).toEqual(
        Cl.tuple({
          "total-value-locked": Cl.uint(0),
          "total-vaults": Cl.uint(0),
          "total-strategies": Cl.uint(3),
          "platform-fee-rate": Cl.uint(50),
          "emergency-pause": Cl.bool(false),
        })
      );
    });

    it("should have pre-initialized strategies", () => {
      const currentBlockHeight = simnet.blockHeight;
      
      // Check strategy 1 - STX Staking
      const { result: strategy1 } = simnet.callReadOnlyFn(contractName, "get-strategy-info", [Cl.uint(1)], deployer);
      expect(strategy1).toEqual(
        Cl.some(
          Cl.tuple({
            name: Cl.stringAscii("STX-Staking-Strategy"),
            protocol: Cl.stringAscii("stx-vault"),
            apy: Cl.uint(1200),
            "tvl-capacity": Cl.uint(100000000000),
            "current-tvl": Cl.uint(0),
            "risk-score": Cl.uint(3),
            "is-active": Cl.bool(true),
            "contract-address": Cl.standardPrincipal(deployer),
            "last-updated": Cl.uint(currentBlockHeight),
          })
        )
      );

      // Check strategy 2 - Lending Protocol
      const { result: strategy2 } = simnet.callReadOnlyFn(contractName, "get-strategy-info", [Cl.uint(2)], deployer);
      expect(strategy2).toEqual(
        Cl.some(
          Cl.tuple({
            name: Cl.stringAscii("Lending-Protocol-Strategy"),
            protocol: Cl.stringAscii("arkadiko"),
            apy: Cl.uint(800),
            "tvl-capacity": Cl.uint(50000000000),
            "current-tvl": Cl.uint(0),
            "risk-score": Cl.uint(5),
            "is-active": Cl.bool(true),
            "contract-address": Cl.standardPrincipal(deployer),
            "last-updated": Cl.uint(currentBlockHeight),
          })
        )
      );

      // Check strategy 3 - LP Farming
      const { result: strategy3 } = simnet.callReadOnlyFn(contractName, "get-strategy-info", [Cl.uint(3)], deployer);
      expect(strategy3).toEqual(
        Cl.some(
          Cl.tuple({
            name: Cl.stringAscii("LP-Farming-Strategy"),
            protocol: Cl.stringAscii("alex"),
            apy: Cl.uint(1500),
            "tvl-capacity": Cl.uint(25000000000),
            "current-tvl": Cl.uint(0),
            "risk-score": Cl.uint(7),
            "is-active": Cl.bool(true),
            "contract-address": Cl.standardPrincipal(deployer),
            "last-updated": Cl.uint(currentBlockHeight),
          })
        )
      );
    });

    it("should correctly identify contract owner as admin", () => {
      const { result } = simnet.callReadOnlyFn(contractName, "is-user-admin", [Cl.standardPrincipal(deployer)], deployer);
      expect(result).toEqual(Cl.bool(true));
    });

    it("should identify non-owners as non-admin", () => {
      const { result } = simnet.callReadOnlyFn(contractName, "is-user-admin", [Cl.standardPrincipal(wallet1)], deployer);
      expect(result).toEqual(Cl.bool(false));
    });
  });

  describe("Read-Only Functions", () => {
    it("should return none for non-existent vault", () => {
      const { result } = simnet.callReadOnlyFn(contractName, "get-vault-info", [Cl.uint(999)], deployer);
      expect(result).toEqual(Cl.none());
    });

    it("should return none for non-existent user position", () => {
      const { result } = simnet.callReadOnlyFn(contractName, "get-user-position", [Cl.uint(1), Cl.standardPrincipal(wallet1)], deployer);
      expect(result).toEqual(Cl.none());
    });

    it("should return 0 for user vault value when no position exists", () => {
      const { result } = simnet.callReadOnlyFn(contractName, "get-user-vault-value", [Cl.uint(1), Cl.standardPrincipal(wallet1)], deployer);
      expect(result).toEqual(Cl.uint(0));
    });

    it("should return none for non-existent strategy", () => {
      const { result } = simnet.callReadOnlyFn(contractName, "get-strategy-info", [Cl.uint(999)], deployer);
      expect(result).toEqual(Cl.none());
    });

    it("should return empty list for user with no vaults", () => {
      const { result } = simnet.callReadOnlyFn(contractName, "get-user-vaults", [Cl.standardPrincipal(wallet1)], deployer);
      expect(result).toEqual(Cl.list([]));
    });

    it("should return the best APY from available strategies", () => {
      const { result } = simnet.callReadOnlyFn(contractName, "get-best-apy", [], deployer);
      expect(result).toEqual(Cl.uint(1500)); // Highest APY from LP-Farming-Strategy
    });
  });

  describe("Error Constants Validation", () => {
    it("should validate error constants are properly defined", () => {
      // Test non-existent vault access
      const { result } = simnet.callPublicFn(contractName, "harvest-vault", [Cl.uint(999)], deployer);
      expect(result).toBeErr(Cl.uint(203)); // ERR_VAULT_NOT_FOUND
    });

    it("should validate unauthorized access error", () => {
      const { result } = simnet.callPublicFn(contractName, "create-vault", [
        Cl.stringAscii("Test Vault"),
        Cl.uint(1),
        Cl.uint(1000000)
      ], wallet1);
      expect(result).toBeErr(Cl.uint(200)); // ERR_NOT_AUTHORIZED
    });
  });
});
