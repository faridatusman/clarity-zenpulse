import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Ensure that users can create profiles",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    
    let block = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "create-profile",
        [types.utf8("Alice")],
        wallet_1.address
      )
    ]);
    
    assertEquals(block.receipts.length, 1);
    assertEquals(block.height, 2);
    assertEquals(block.receipts[0].result.expectOk(), true);
  },
});

Clarinet.test({
  name: "Ensure users can log meditation sessions",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    
    let block = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "create-profile",
        [types.utf8("Alice")],
        wallet_1.address
      ),
      Tx.contractCall(
        "zenpulse",
        "log-session",
        [types.uint(20), types.utf8("calm"), types.utf8("peaceful")],
        wallet_1.address
      )
    ]);
    
    assertEquals(block.receipts.length, 2);
    assertEquals(block.receipts[1].result.expectOk(), types.uint(1));
  },
});

Clarinet.test({
  name: "Test streak calculation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    
    let block = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "create-profile",
        [types.utf8("Alice")],
        wallet_1.address
      ),
      Tx.contractCall(
        "zenpulse",
        "log-session",
        [types.uint(20), types.utf8("calm"), types.utf8("peaceful")],
        wallet_1.address
      )
    ]);
    
    chain.mineEmptyBlockUntil(100);
    
    let block2 = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "log-session",
        [types.uint(15), types.utf8("stressed"), types.utf8("relaxed")],
        wallet_1.address
      )
    ]);
    
    const profile = chain.callReadOnlyFn(
      "zenpulse",
      "get-profile",
      [types.principal(wallet_1.address)],
      wallet_1.address
    );
    
    assertEquals(profile.result.expectSome().streak, types.uint(2));
  },
});
