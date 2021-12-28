use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

declare_id!("HwWNsWdb9uezpBSRn9EKd7h4UuYAzw8Kp4gmE5Bsp1Ne");


#[program]
pub mod solana_twitter {
    use super::*;
    // Rename initialize() instruction to send_tweet()
    // NOTE Any argument that is NOT an account can be passed after context
    pub fn send_tweet(ctx: Context<SendTweetInstruction>, topic: String, content: String) -> ProgramResult {
        // 1. Extract all the accounts we need from ctx
        let tweet: &mut Account<Tweet> = &mut ctx.accounts.tweet;
        // Access author account to save it on the tweet account
        let author: &Signer = &ctx.accounts.author;
        // Use Solana's Clock::get() for timestamp on tweet
        let clock: Clock = Clock::get().unwrap();

        // 2. Add some data validation guards
        if topic.chars().count() > MAX_TOPIC_CHARS {
            // Return an error
            // NOTE into() coverts our ErrorCode type into w/e is required by
            // the code which here is Err and more precisely ProgramError
            return Err(ErrorCode::TopicTooLong.into())
        } 

        if content.chars().count() > MAX_CONTENT_CHARS {
            // Return an error
            // NOTE into() coverts our ErrorCode type into w/e is required by
            // the code which here is Err and more precisely ProgramError
            return Err(ErrorCode::ContentTooLong.into())
        }

        // 3. We now have all the data we need to fill the new tweet account
        tweet.author = *author.key;
        tweet.timestamp = clock.unix_timestamp;
        tweet.topic = topic;
        tweet.content = content;

        // NOTE At this point we have a working instruction that initializes
        // a new Tweet account for us and hydrates/populates it with the right info
        Ok(())
    }
}

// 4. Define the context of Tweet instruction for Context<T>
// NOTE By default ctx: Context<Initialize>. We're changing it to SendTweetInstruction struct
// NOTE Account<'info, Tweet> is from Anchor, which wraps AccountInfo
// and parses the AccountInfo.data (u8[]) according to Tweet struct
// NOTE Account Contraints (by Anchor) are like middleware that occur before
// the instruction function e.g. send_tweet() is being executed
#[derive(Accounts)]
pub struct SendTweetInstruction<'info> {
    // Ensure account of type Account is signer by using account constraints
    #[account(init, payer = author, space = Tweet::LEN)]
    pub tweet: Account<'info, Tweet>, // account that instruction will create
    // Mark author prop as mutable so we can change their money balance to pay
    #[account(mut)]
    pub author: Signer<'info>, // author of tweet. This account signs the instruction
    // Ensure official Solana System Program is used (ie pub key matches system_program::ID)
    #[account(address = system_program::ID)]
    pub system_program: AccountInfo<'info>, // Used to init the Tweet account and rent
}

// 1. Define the structure of Tweet account
// NOTE We could consider adding another account e.g. UserProfile that
// our 'program' object could also create and then fetch
#[account]
pub struct Tweet {
    pub author: Pubkey,
    pub timestamp: i64,
    pub topic: String,
    pub content: String,
}

// 2. Add some useful constants for sizing properties (helps compute rent)
const DISCRIMATOR_LENGTH: usize = 8; // Stores type of account (Tweet, UserProfile, etc)
const PUBLIC_KEY_LENGTH: usize = 32; 
const TIMESTAMP_LENGTH: usize = 8;
const STRING_LENGTH_PREFIX: usize = 4; // Stores the size of the string.
const MAX_TOPIC_LENGTH: usize = 200; // 50 chars max
const MAX_CONTENT_LENGTH: usize = 280 * 4; // 280 chars max
const MAX_TOPIC_CHARS: usize = 50;
const MAX_CONTENT_CHARS: usize = 280;

// 3. Add a constant on the Tweet account that provides its total size (for rent)
// NOTE This allows us to access the total size using Tweet::LEN
impl Tweet {
    const LEN: usize = DISCRIMATOR_LENGTH // Type of account
        + PUBLIC_KEY_LENGTH // Author
        + TIMESTAMP_LENGTH // Timestamp
        + STRING_LENGTH_PREFIX + MAX_TOPIC_LENGTH // Topic
        + STRING_LENGTH_PREFIX + MAX_CONTENT_LENGTH; // Content
}



// === Custom Errors
#[error]
pub enum ErrorCode {
    #[msg("The provided topic should be 50 characters long maximum.")]
    TopicTooLong,
    #[msg("The provided content should be 280 characters long maximum.")]
    ContentTooLong,
}
