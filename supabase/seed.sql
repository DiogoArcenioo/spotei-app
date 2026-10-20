-- Raridades iniciais são estimativas editoriais. Não afirmam números de produção.
insert into public.car_brands(nome) values('Porsche'),('BMW'),('Ferrari'),('Volkswagen'),('Chevrolet'),('Ford') on conflict do nothing;
insert into public.car_catalog(marca,modelo,geracao,versao,ano,raridade,caracteristicas,justificativa,verificado,classificacao) values
('Porsche','911','992','GT3 RS',2023,'epico','["Aerofólio traseiro","Cupê esportivo"]','Estimativa editorial. Exige revisão antes de pontuar.',false,'estimativa'),
('BMW','M3','G80','Competition',2022,'raro','["Sedã esportivo","Grade dupla"]','Estimativa editorial para versão esportiva importada.',true,'estimativa'),
('Ferrari','F40',null,null,1990,'lendario','["Aerofólio fixo","Cupê clássico"]','Estimativa editorial. Exige revisão antes de pontuar.',false,'estimativa'),
('Volkswagen','Golf','MK7','GTI',2017,'incomum','["Hatch esportivo"]','Estimativa editorial para versão esportiva de hatch.',true,'estimativa'),
('Chevrolet','Onix',null,null,2020,'comum','["Hatch compacto"]','Estimativa editorial para modelo frequente no Brasil.',true,'estimativa'),
('Ford','Mustang','S550','GT',2019,'raro','["Cupê","Capô alongado"]','Estimativa editorial para cupê importado.',true,'estimativa') on conflict(chave) do nothing;
