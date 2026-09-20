# Kanıt sözlüğü (F0)

- `live`: Gerçek provider/üretim davranışı; merchant, staging/canary veya hukuk/muhasebe imzası gerekir. Test/mock ile iddia edilemez.
- `ready`: `GET /api/ready` 200 + `db:ok`; migration ve storage hazır. Canlı trafik onayı değildir.
- `delivered`: Alıcı/provider kabulü (delivery evidence); kuyruğa yazım değildir.
- `paid`: Ledger'da confirmed + allocation; UI işareti veya callback tek başına değildir.
- `issued`: Mali belge düzenlendi + delivery intent ayrı; PDF varlığı yasal düzenleme değildir.
