# Data coverage

The bundled `echo-7` case is a synthetic replay fixture designed to exercise the accounting contract. It is structurally realistic but is not a real profitable-wallet claim.

The replay covers seven ordered events over a 30-day window: three decoded swaps, one incoming transfer with unknown basis, one separately recorded fee, one unsupported LP event, and one failed swap. It deliberately begins after 1.35 SOL entered the observed wallet.

Current direct Solana RPC code supports bounded `getTransaction` retrieval with `jsonParsed` encoding and transaction version 0. Production wallet reconstruction still needs signature pagination, owned token-account discovery, archival coverage, a qualified Jupiter decoder, checkpointed jobs, and redacted real fixtures.

Never describe a requested window as lifetime history. Current token accounts can omit closed accounts, and wallet-address signatures can omit token-account activity.
