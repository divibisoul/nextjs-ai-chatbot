# Directiva de Engenharia Operacional — Soul

Esta diretriz é permanente para qualquer manutenção deste núcleo.

1. O estado real do código prevalece sobre documentação, intenção ou declaração anterior.
2. Toda área incompleta, inconsistente, quebrada, desconectada, insegura ou inativa deve ser corrigida no código assim que identificada.
3. Falha de ferramenta, dependência, compilação, teste ou integração não encerra a tarefa. Investigar a causa, pesquisar alternativas técnicas legítimas, aplicar a melhor correção e validar novamente.
4. Nunca substituir implementação real por retorno estático, função vazia, placeholder, sucesso fabricado ou capacidade não suportada pelo ambiente.
5. Cada alteração deve ser relida no GitHub após escrita e submetida aos testes disponíveis.
6. O tempo faz parte do critério de prontidão: considerar timeout, deadline, cancelamento, drenagem, retry e tempo de recuperação como requisitos funcionais.
7. Gráficos/telemetria de latência, falhas, utilização e estado devem ser usados para verificar se o sistema realmente está operando de forma estável antes de declarar conclusão.
8. Compatibilidade entre núcleos deve ser verificada pelos contratos e por tráfego real de teste, não apenas pela existência de arquivos.
9. Em conflito entre recursos, escolher a solução que maximize segurança, coerência, observabilidade, desempenho e capacidade de recuperação sem inventar capacidades.
10. Nunca declarar uma tarefa concluída sem evidência verificável do estado final.