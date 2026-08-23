<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\Equipe\CreateEquipeDTO;
use App\DTOs\Equipe\UpdateEquipeDTO;
use App\Models\Equipe;
use App\Repositories\Contracts\EquipeRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final class EquipeService
{
    public function __construct(
        private readonly EquipeRepositoryInterface $repository,
    ) {
    }

    public function create(CreateEquipeDTO $dto): Equipe
    {
        return DB::transaction(function () use ($dto): Equipe {
            /** @var Equipe $equipe */
            $equipe = $this->repository->create($dto->toArray());

            foreach ($dto->agent_ids as $agentId) {
                $equipe->agents()->attach($agentId, [
                    'date_debut' => now()->toDateString(),
                    'fonction' => 'Agent de collecte',
                ]);
            }

            return $equipe;
        });
    }

    public function update(Equipe $equipe, UpdateEquipeDTO $dto): Equipe
    {
        return DB::transaction(function () use ($equipe, $dto): Equipe {
            /** @var Equipe $updated */
            $updated = $this->repository->update($equipe, $dto->toArray());

            if ($dto->agent_ids !== null) {
                // Pour simplifier, on synchronise avec la date de début courante
                $syncData = [];
                foreach ($dto->agent_ids as $agentId) {
                    $syncData[$agentId] = [
                        'date_debut' => now()->toDateString(),
                        'fonction' => 'Agent de collecte',
                    ];
                }
                $updated->agents()->sync($syncData);
            }

            return $updated;
        });
    }

    public function findOrFail(int|string $id): Equipe
    {
        /** @var Equipe */
        return $this->repository->findOrFail($id);
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        $paginator = $this->repository->paginate($perPage);
        $paginator->getCollection()->load(['agents', 'zones']);

        return $paginator;
    }

    public function delete(Equipe $equipe): bool
    {
        return $this->repository->delete($equipe);
    }
}
