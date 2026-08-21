import { requireRole } from "@/lib/auth-guard";
import { getOutletsForUser } from "@/lib/pos";
import { getStockItemOptions } from "@/lib/inventory";
import {
  getRecipeableProducts,
  getRecipeIngredients,
  getRecipes,
  type RecipeIngredientRow,
} from "@/lib/recipes";
import { OutletSelect } from "@/app/ui/inventory/outlet-select";
import { RecipeManager } from "@/app/ui/inventory/recipe-manager";

export default async function RecipePage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GM", "MANAGER"]);
  const outlets = await getOutletsForUser(session);
  const params = await searchParams;

  const selectedOutletId =
    (params.outlet ? Number(params.outlet) : null) &&
    outlets.some((o) => o.id === Number(params.outlet))
      ? Number(params.outlet)
      : (outlets[0]?.id ?? 0);

  const [recipes, products, availableItems] = await Promise.all([
    getRecipes(selectedOutletId),
    getRecipeableProducts(selectedOutletId),
    getStockItemOptions(selectedOutletId),
  ]);

  const ingredientsByRecipe: Record<number, RecipeIngredientRow[]> = {};
  await Promise.all(
    recipes.map(async (recipe) => {
      ingredientsByRecipe[recipe.recipeId] = await getRecipeIngredients(recipe.recipeId);
    }),
  );

  return (
    <div className="p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-gray-400">Inventory</p>
          <h1 className="text-2xl font-bold text-gray-900">Recipe</h1>
        </div>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
      </div>

      <div className="mt-6">
        <RecipeManager
          outletId={selectedOutletId}
          recipes={recipes}
          ingredientsByRecipe={ingredientsByRecipe}
          products={products}
          availableItems={availableItems}
        />
      </div>
    </div>
  );
}
