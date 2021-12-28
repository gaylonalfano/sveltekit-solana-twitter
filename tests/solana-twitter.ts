import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SolanaTwitter } from "../target/types/solana_twitter";
import * as assert from "assert";
import * as bs58 from "bs58";

describe("solana-twitter", () => {
  // Configure the client to use the local cluster.
  // NOTE This generates a new Provider. Cluster + Wallet = Provider
  anchor.setProvider(anchor.Provider.env());

  // Uses the registered Provider to create a new Program object
  const program = anchor.workspace.SolanaTwitter as Program<SolanaTwitter>;

  it("can send a new tweet", async () => {
    // === Before sending the transaction (ie. create Tweet) to the blockchain
    // NOTE We're building up our Context<SendTweetInstruction> to pass to
    // our sendTweet() instruction.
    const tweet = anchor.web3.Keypair.generate();
    // const author = program.provider.wallet.publicKey;
    // const systemProgram = anchor.web3.SystemProgram.programId;

    // NOTE The rpc object exposes an API matching our program's instructions
    // NOTE The LAST arg for any program.rpc method is always the CONTEXT!
    await program.rpc.sendTweet("nft", "Did you see TW today?", {
      // Q: Where do we define 'accounts' and 'signers' props? On Anchor Context Type?
      accounts: {
        // Accounts here e.g. tweet, author, and system_program
        tweet: tweet.publicKey,
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        // author,
        // systemProgram,
      },
      signers: [
        // Key pairs of signers here...
        // NOTE We don't provide key pair for OUR wallet since Anchor does this,
        // so we don't need to manually add 'author' since it's automatically added
        tweet,
      ],
    });

    // === After sending the transaction (ie. created Tweet) to the blockchain
    // Need to confirm that our created Tweet account matches the data we used
    // NOTE Our program created the Tweet account, so we fetch the account on the
    // blockchain via the API provided by our 'program' object.
    // https://lorisleiva.com/create-a-solana-dapp-from-scratch/testing-our-instruction
    const createdTweetAccount = await program.account.tweet.fetch(
      tweet.publicKey
    );
    // console.log(createdTweetAccount);

    // === Test assertions using 'assert' library
    // NOTE Use toBase58() to compare Strings instead of Objects
    // Your Solana wallet address is the Base 58 encoding of your public key
    assert.equal(
      createdTweetAccount.author.toBase58(),
      program.provider.wallet.publicKey.toBase58()
    );
    assert.equal(createdTweetAccount.topic, "nft");
    assert.equal(createdTweetAccount.content, "Did you see TW today?");
    assert.ok(createdTweetAccount.timestamp);
  });

  it("can send a new tweet without a topic", async () => {
    // Call the "SendTweetInstruction" instruction.
    const tweet = anchor.web3.Keypair.generate();

    await program.rpc.sendTweet("", "gm", {
      accounts: {
        tweet: tweet.publicKey,
        author: program.provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweet],
    });

    // Fetch the newly created tweet account details
    const createdTweetAccount = await program.account.tweet.fetch(
      tweet.publicKey
    );

    // Ensure it has the right data
    assert.equal(
      createdTweetAccount.author.toBase58(),
      program.provider.wallet.publicKey.toBase58()
    );
    assert.equal(createdTweetAccount.topic, "");
    assert.equal(createdTweetAccount.content, "gm");
    assert.ok(createdTweetAccount.timestamp);
  });

  it("can send a new tweet from a different author", async () => {
    // Generate another user account and airdrop them some SOL
    // NOTE Every time a new local ledger is created via solana-test-validator,
    // it automatically airdrops 500m SOL to local wallet ~/.config/solana/id.json
    // NOTE 1 SOL equals 1,000,000,000 lamports
    const otherUser = anchor.web3.Keypair.generate();
    // Request some SOL to be airdropped into other user's wallet to
    // pay for Tweet account
    const signature = await program.provider.connection.requestAirdrop(
      otherUser.publicKey,
      100000000
    );
    // Confirm other user has received the SOL to pay for Tweet
    await program.provider.connection.confirmTransaction(signature);

    // Call the "SendTweetInstruction" instruction on behalf of this other user
    const tweet = anchor.web3.Keypair.generate();
    await program.rpc.sendTweet("nft", "Gonna work?", {
      accounts: {
        tweet: tweet.publicKey,
        author: otherUser.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
      signers: [tweet, otherUser],
    });

    const createdTweetAccount = await program.account.tweet.fetch(
      tweet.publicKey
    );

    assert.notEqual(
      createdTweetAccount.author.toBase58(),
      program.provider.wallet.publicKey.toBase58()
    );
    assert.equal(
      createdTweetAccount.author.toBase58(),
      otherUser.publicKey.toBase58()
    );
    assert.equal(createdTweetAccount.topic, "nft");
    assert.equal(createdTweetAccount.content, "Gonna work?");
    assert.ok(createdTweetAccount.timestamp);
  });

  it("cannot provide a topic with more than 50 characters", async () => {
    // NOTE You can also use assert.throws() instead of try/catch
    // Q: How would you do this using assert.throws()?
    try {
      const tweet = anchor.web3.Keypair.generate();
      const topicWith51Chars = "x".repeat(51);
      await program.rpc.sendTweet(topicWith51Chars, "Who wants Chipotle?", {
        accounts: {
          tweet: tweet.publicKey,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [tweet],
      });
    } catch (error) {
      assert.equal(
        error.msg,
        "The provided topic should be 50 characters long maximum."
      );
      return;
    }

    // This force fails the assertion/test
    assert.fail(
      "The instruction should have failed with a 51-character topic."
    );
  });

  it("cannot provide a content with more than 280 characters", async () => {
    try {
      const tweet = anchor.web3.Keypair.generate();
      const contentWith281Chars = "y".repeat(281);
      await program.rpc.sendTweet("solana", contentWith281Chars, {
        accounts: {
          tweet: tweet.publicKey,
          author: program.provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        },
        signers: [tweet],
      });
    } catch (error) {
      assert.equal(
        error.msg,
        "The provided content should be 280 characters long maximum."
      );
      return;
    }

    assert.fail(
      "The instruction should have failed with a 281-character content."
    );
  });

  it("can fetch all tweets accounts", async () => {
    const tweetAccounts = await program.account.tweet.all();
    // NOTE Need to use solana-test-validator --reset to ensure
    // we have a clean ledger to work with.
    // NOTE The number of accounts is due to the other tests
    assert.equal(tweetAccounts.length, 3);
  });

  it("can filter tweets by author", async () => {
    // https://lorisleiva.com/create-a-solana-dapp-from-scratch/fetching-tweets-from-the-program
    const authorPublicKey = program.provider.wallet.publicKey;
    // NOTE We have dataSize and memcmp filters
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          // offset = where in the data the author's pubkey is stored
          // NOTE We know this value when we computed size of Tweet account.
          // Recall that whenever a new account is created, a DISCRIMATOR of
          // exactly 8 bytes will be added to beginning of data. See episode 3.
          offset: 8, // Discrimator
          // bytes = base-58 encoded array of bytes (e.g., publicKey.toBase58(), bs58.encode(Buffer.from('nft')) )
          bytes: authorPublicKey.toBase58(),
        },
      },
    ]);

    // NOTE Need to use solana-test-validator --reset to ensure
    // we have a clean ledger to work with.
    // NOTE The number of accounts is due to the other tests
    assert.equal(tweetAccounts.length, 2);
    // Ensure that all Tweets are from this wallet
    assert.ok(
      tweetAccounts.every((tweetAccount) => {
        return (
          tweetAccount.account.author.toBase58() === authorPublicKey.toBase58()
        );
      })
    );
  });

  it("can filter tweets by topic", async () => {
    const topic = "nft";
    const tweetAccounts = await program.account.tweet.all([
      {
        memcmp: {
          offset:
            8 + // Discrimator
            32 + // Author public key
            8 + // Timestamp
            4, // Topic string prefix
          // bytes = base-58 encoded array of bytes (e.g., publicKey.toBase58(), bs58.encode(buffer) )
          // NOTE Need to import bs58
          bytes: bs58.encode(Buffer.from(topic)),
        },
      },
    ]);

    assert.equal(tweetAccounts.length, 2);
    assert.ok(
      tweetAccounts.every((tweetAccount) => {
        return tweetAccount.account.topic === topic;
      })
    );
  });
});
