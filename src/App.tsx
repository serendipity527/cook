import { CookProvider } from './runtime/CookProvider';
import { useAppStore } from './store/useAppStore';
import { Cook } from './screens/Cook';
import { Done } from './screens/Done';
import { Home } from './screens/Home';
import { Prep } from './screens/Prep';
import { RecipeDetail } from './screens/RecipeDetail';

export default function App() {
  const view = useAppStore((state) => state.view);

  return (
    <CookProvider>
      {view.name === 'home' ? <Home /> : null}
      {view.name === 'detail' ? <RecipeDetail recipeId={view.recipeId} /> : null}
      {view.name === 'prep' ? <Prep recipeId={view.recipeId} /> : null}
      {view.name === 'cook' ? <Cook /> : null}
      {view.name === 'done' ? <Done /> : null}
    </CookProvider>
  );
}
