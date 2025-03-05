# solana SPL token


## create a keypair for mint
```bash 
solana-keygen grind --starts-with mnt:1
```
## create the spl token using `spl-token create-token`
```bash
spl-token create-token \
--enable-metadata \
--program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
mnttcCKXToaPzVKkDorBUEPS9a4kjYRqQ4hwJ6kWAz1.json

```
## initialize the metadata inside the mint
`spl-token initialize-metadata mnttcCKXToaPzVKkDorBUEPS9a4kjYRqQ4hwJ6kWAz1 <YOUR_TOKEN_NAME> <YOUR_TOKEN_SYMBOL> <YOUR_TOKEN_URI>`, and sign with the mint authority.

## create associated token account for the mint
```bash
spl-token create-account <TOKEN_MINT_ADDRESS>
```

## mint tokens
```bash
spl-token mint <TOKEN_MINT_ADDRESS> <AMOUNT> 
```

## transfer tokens
```bash
spl-token transfer <TOKEN_MINT_ADDRESS> <RECIPIENT_ADDRESS> <AMOUNT>
```

# More info
- [SPL Token Doc](https://solana.com/docs/core/tokens)
- [SPL Token](https://spl.solana.com/token/)
- [Solana bootcamp - spl token](https://github.com/solana-developers/developer-bootcamp-2024/tree/main/project-5-tokens)