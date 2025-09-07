---
title: 'Overview do Apache Airflow'
description: 'Lorem ipsum dolor sit amet'
pubDate: 'August 23 2025'
heroImage: '../../../assets/01-data-modeling.jpg'
lang: 'pt-br'
---


## Visão geral da arquitetura do Apache Airflow

- **Webserver**: apresenta uma interface de usuário que nos permite inspecionar, acionar e acompanhar o comportamento dos DAGs e suas tarefas;
- **Pasta de arquivos DAG**: armazena os arquivos DAGs criados. Ela é lida pelo agendador e executor;
- **Scheduler (agendador)**: lida com o acionamento dos fluxos de trabalho (DAGs) agendados e o envio de tarefas para o executor;
- **Banco de dados**: usado pelo agendador, executor e webserver para armazenar os metadados e status do DAG e suas tarefas;
- **Executor**: lida com as tarefas em execução. O Airflow possui vários executores, mas apenas um é utilizado por vez.


## Componentes

- **DAGs**: 
- **Tasks**:
- **Operators**:


### Execução do Airflow em Ubuntu

Atualizar os pacotes ubuntu:
```bash
sudo apt update
sudo apt upgrade
```

Instalação do Python e dos pacotes:
```bash
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt install python3.9
sudo apt install python3.9-venv

```

Criação e ativação do ambiente virtual:
```bash
python3.9 -m venv venv
source venv/bin/activate
```


Para iniciar todos os componentes (banco de dados, webserver e o scheduler):
```bash
airflow standalone
```



### CRON Expressions

Para definir intervalos de tempo um pouco mais complexos para a execução de um DAG, é possível usar CRON Expressions. A estrutura dessa expressão é definida abaixo:
```markdown
* * * * *
| | | | |
1 2 3 4 5 
```

Onde cada número respectivamente representa:
1. minuto: 0-59;
2. hora: 0-23;
3. dia do mês: 1-31;
4. mês: 1-12;
5. dia da semana: 0-6 representando de domingo a sábado.

Referência: https://en.wikipedia.org/wiki/Cron#CRON_expression


### XCom

O XCom é um recurso nativo do Airflow para compartilhar dados de tarefas. Esse recurso permite que as tarefas troquem metadados de tarefas ou pequenas quantidades de dados. Eles são definidos por chave, valor e data.

Os XComs podem ser enviados (xcom.push) ou recebidos (xcom.pull) por uma tarefa. Quando enviado por uma tarefa, ele é armazenado no banco de dados do Airflow e fica disponível para todas as outras tarefas.

Esse recurso deve ser utilizado apenas para passar pequenas quantidades de dados entre as tarefas. Ele não foi projetado para passar dados como DataFrames ou semelhantes. Para casos como esse, podemos utilizar o armazenamento de dados intermediário, que é mais apropriado para grandes blocos de dados.

Referência: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/xcoms.html