<?php

declare(strict_types=1);

namespace App\Services;

use App\DTOs\Affectation\CreateAffectationDTO;
use App\Enums\SignalementStatutEnum;
use App\Exceptions\Business\SignalementNotValidatedException;
use App\Models\Affectation;
use App\Repositories\Contracts\AffectationRepositoryInterface;
use App\Repositories\Contracts\SignalementRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

final readonly class AffectationService
{
    public function __construct(
        private AffectationRepositoryInterface $repository,
        private SignalementRepositoryInterface $signalementRepository,
        private SignalementService             $signalementService,
    ) {
    }

    public function create(CreateAffectationDTO $dto): Affectation
    {
        return DB::transaction(function () use ($dto): Affectation {
            $signalement = $this->signalementRepository
                ->findOrFail($dto->signalement_id);

            if (!$signalement->statut->peutEtreAffecte()) {
                throw new SignalementNotValidatedException();
            }

            $affectation = $this->repository->create(
                $dto->toArray()
            );

            $this->signalementService->transitionTo(
                $signalement,
                SignalementStatutEnum::AFFECTE
            );

            return $affectation->load([
                'signalement',
                'equipe',
            ]);
        });
    }

    public function findOrFail(int|string $id): \Illuminate\Database\Eloquent\Model
    {
        return $this->repository->findOrFail($id);
    }

    public function paginate(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function delete(Affectation $affectation): bool
    {
        return $this->repository->delete($affectation);
    }
}
