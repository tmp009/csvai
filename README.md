# CSVAI

## run in docker

start

```console
docker compose up
```

test

```console
docker compose exec app node test.js http://localhost:3000/query examples/hiking.csv "Get 1 summer item"
docker compose exec app node test.js http://localhost:3000/query examples/shopify.csv "Get pants"
docker compose exec app node test.js http://localhost:3000/query examples/cars.csv "Give electric cars"
```

## run with node

```console
node test.js http://localhost:3000/query examples/hiking.csv "Get 1 summer item"
```

```console
npm test
```
