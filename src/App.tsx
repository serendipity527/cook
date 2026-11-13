import { ToastProvider } from './components/ToastProvider';
import { NavigationProvider } from './navigation/NavigationProvider';
import { CookProvider } from './runtime/CookProvider';
import { useAppStore } from './store/useAppStore';
import { Cook } from './screens/Cook';
import { Done } from './screens/Done';
import { Home } from './screens/Home';
import { Prep } from './screens/Prep';
import { RecipeDetail } from './screens/RecipeDetail';
import { RecipeEditor } from './screens/RecipeEditor';
import { Studio } from './screens/Studio';
import { StudioChat } from './screens/StudioChat';

export default function App() {
  const view = useAppStore((state) => state.view);

  return (
    <ToastProvider>
      <NavigationProvider>
        <CookProvider>
          {view.name === 'home' ? <Home /> : null}
          {view.name === 'detail' ? <RecipeDetail recipeId={view.recipeId} /> : null}
          {view.name === 'prep' ? <Prep recipeId={view.recipeId} /> : null}
          {view.name === 'cook' ? <Cook /> : null}
          {view.name === 'done' ? <Done /> : null}
          {view.name === 'studio' ? <Studio /> : null}
          {view.name === 'chat' ? <StudioChat /> : null}
          {view.name === 'edit' ? <RecipeEditor recipeId={view.recipeId} /> : null}
        </CookProvider>
      </NavigationProvider>
    </ToastProvider>
  );
}
