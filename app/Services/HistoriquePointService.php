<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\HistoriquePoint\CreateHistoriquePointDTO;
use App\Models\HistoriquePoint;
use App\Repositories\Contracts\HistoriquePointRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

final class HistoriquePointService
{
    public function __construct(
        private readonly HistoriquePointRepositoryInterface $repository,
    ) {
    }

    public function awardPoints(int $userId, int $points, string $motif, ?string $description = null): HistoriquePoint
    {
        $dto = new CreateHistoriquePointDTO(
            nombre_points: $points,
            motif: $motif,
            date_attribution: now()->toDateString(),
            user_id: $userId,
            description: $description
        );

        /** @var HistoriquePoint */
        return $this->repository->create($dto->toArray());
    }

    public function findOrFail(int|string $id): HistoriquePoint
    {
        /** @var HistoriquePoint */
        return $this->repository->findOrFail($id);
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }
}
