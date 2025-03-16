# legacy-token-lottery

# error when running the tests

- AnchorError caused by account: token_metadata_program. Error Code:
  InvalidProgramExecutable. Error Number: 3009. Error Message: Program account
  is not executable.

- this is caused we dont have meta data program on local see this
  [issue](https://solana.stackexchange.com/questions/13206/error-anchorerror-caused-by-account-token-metadata-program-error-code-invali)

# solution
```bash
solana program dump -um metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so
```

Then use this command to load the program to the local
validator before running the tests

```bash
solana-test-validator --reset --bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s metadata.so
```


How to use setup-local and start-validator shell script
```bash
cd setup

chmod +x setup-local.sh
chmod +x start-validator.sh

./setup-local.sh
./start-validator.sh
```
