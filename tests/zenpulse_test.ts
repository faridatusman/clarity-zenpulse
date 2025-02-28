import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Ensure that users can create profiles and prevents duplicates",
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
    
    assertEquals(block.receipts[0].result.expectOk(), true);

    // Try creating duplicate profile
    let block2 = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "create-profile",
        [types.utf8("Alice")],
        wallet_1.address
      )
    ]);

    assertEquals(block2.receipts[0].result.expectErr(), types.uint(409));
  },
});

Clarinet.test({
  name: "Ensure users can log meditation sessions with proper validation",
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
    
    assertEquals(block.receipts[1].result.expectOk(), types.uint(1));

    // Test invalid duration
    let block2 = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "log-session",
        [types.uint(0), types.utf8("calm"), types.utf8("peaceful")],
        wallet_1.address
      )
    ]);

    assertEquals(block2.receipts[0].result.expectErr(), types.uint(400));
  },
});

Clarinet.test({
  name: "Test accurate streak calculation with daily boundaries",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    
    // Create profile and log first session
    let block1 = chain.mineBlock([
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
    
    // Mine 144 blocks (1 day)
    chain.mineEmptyBlockUntil(146);
    
    // Log second session
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
