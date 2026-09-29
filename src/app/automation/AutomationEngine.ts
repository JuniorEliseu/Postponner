import { eventBus } from '../events/EventBus';
import { cardRepo, listRepo } from '../../database/indexeddb';

export function initAutomationEngine() {
  eventBus.subscribe('CARD_MOVED', async (payload: any) => {
    const { cardId, newListId, oldListId } = payload;
    
    // Se não trocou de lista, não faz nada
    if (newListId === oldListId) return;

    try {
      const card = await cardRepo.get(cardId);
      const targetList = await listRepo.get(newListId);

      if (!card || !targetList) return;

      // Regra 1: Marcar como concluído se a lista contiver "DONE" ou "CONCLUÍDO"
      const listName = targetList.name.toUpperCase();
      if (listName.includes('DONE') || listName.includes('CONCLUÍDO') || listName.includes('FEITO')) {
        if (!card.completed) {
          card.completed = true;
          await cardRepo.update(card);
          // Força a re-renderização disparando mudança de estado
          eventBus.publish('STATE_CHANGED', null);
        }
      } else {
        // Regra 2: Desmarcar caso saia da lista de concluído para outra
        if (card.completed) {
          card.completed = false;
          await cardRepo.update(card);
          eventBus.publish('STATE_CHANGED', null);
        }
      }
    } catch (err) {
      console.error("Automation Engine Error:", err);
    }
  });
}
