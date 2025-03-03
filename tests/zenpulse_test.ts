import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Ensure that users can create profiles and prevents duplicates and empty names",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    
    // Test valid profile creation
    let block = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "create-profile",
        [types.utf8("Alice")],
        wallet_1.address
      )
    ]);
    
    assertEquals(block.receipts[0].result.expectOk(), true);

    // Test duplicate profile
    let block2 = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "create-profile",
        [types.utf8("Alice")],
        wallet_1.address
      )
    ]);
    assertEquals(block2.receipts[0].result.expectErr(), types.uint(409));

    // Test empty name
    let block3 = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "create-profile",
        [types.utf8("")],
        wallet_1.address
      )
    ]);
    assertEquals(block3.receipts[0].result.expectErr(), types.uint(400));
  },
});

Clarinet.test({
  name: "Ensure users can log meditation sessions with proper validation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet_1 = accounts.get("wallet_1")!;
    
    // Create profile and log valid session
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

    // Test invalid duration (0)
    let block2 = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "log-session",
        [types.uint(0), types.utf8("calm"), types.utf8("peaceful")],
        wallet_1.address
      )
    ]);
    assertEquals(block2.receipts[0].result.expectErr(), types.uint(400));

    // Test invalid duration (too high)
    let block3 = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "log-session",
        [types.uint(181), types.utf8("calm"), types.utf8("peaceful")],
        wallet_1.address
      )
    ]);
    assertEquals(block3.receipts[0].result.expectErr(), types.uint(400));

    // Test empty mood
    let block4 = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "log-session",
        [types.uint(20), types.utf8(""), types.utf8("peaceful")],
        wallet_1.address
      )
    ]);
    assertEquals(block4.receipts[0].result.expectErr(), types.uint(400));
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
    
    let profile1 = chain.callReadOnlyFn(
      "zenpulse",
      "get-profile",
      [types.principal(wallet_1.address)],
      wallet_1.address
    );
    assertEquals(profile1.result.expectSome().streak, types.uint(1));
    
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
    
    let profile2 = chain.callReadOnlyFn(
      "zenpulse",
      "get-profile",
      [types.principal(wallet_1.address)],
      wallet_1.address
    );
    assertEquals(profile2.result.expectSome().streak, types.uint(2));
    
    // Mine 2 days worth of blocks
    chain.mineEmptyBlockUntil(434);
    
    // Log session after missing a day
    let block3 = chain.mineBlock([
      Tx.contractCall(
        "zenpulse",
        "log-session",
        [types.uint(15), types.utf8("tired"), types.utf8("energized")],
        wallet_1.address
      )
    ]);
    
    let profile3 = chain.callReadOnlyFn(
      "zenpulse",
      "get-profile",
      [types.principal(wallet_1.address)],
      wallet_1.address
    );
    assertEquals(profile3.result.expectSome().streak, types.uint(1));
  },
});
