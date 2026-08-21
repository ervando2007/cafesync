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
import { getT } from "@/lib/i18n/server";
import { PageHeader } from "@/app/ui/page-header";

export default async function RecipePage({
  searchParams,
}: {
  searchParams: Promise<{ outlet?: string }>;
}) {
  const session = await requireRole(["ADMIN", "GM", "MANAGER"]);
  const { t } = await getT();
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
    <>
      <PageHeader eyebrow={t("nav.inventory")} title={t("nav.recipe")}>
        <OutletSelect outlets={outlets} selectedOutletId={selectedOutletId} />
      </PageHeader>

      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <RecipeManager
          outletId={selectedOutletId}
          recipes={recipes}
          ingredientsByRecipe={ingredientsByRecipe}
          products={products}
          availableItems={availableItems}
        />
      </div>
    </>
  );
}
