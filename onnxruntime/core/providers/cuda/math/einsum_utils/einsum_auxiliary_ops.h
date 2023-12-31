// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// This module hosts implementations and thin wrappers over other onnx operator implementations
// that will be called from within the Einsum operator implementation

#pragma once

#include "core/providers/cpu/math/einsum_utils/einsum_auxiliary_ops.h"
#include "core/providers/cuda/tensor/transpose.h"
#include "core/providers/cuda/reduction/reduction_ops.h"
#include "core/providers/cuda/shared_inc/fpgeneric.h"
#include "core/providers/cpu/tensor/utils.h"
#include "einsum_auxiliary_ops_diagonal.h"
#include "core/providers/cuda/cuda_common.h"

namespace onnxruntime {

namespace EinsumOp {

// Holds CUDA assets required for CUDA ops that need to be executed as part of the Einsum flow
struct EinsumCudaAssets {
  explicit EinsumCudaAssets(cublasHandle_t cublas_handle,
                            const CUDAExecutionProvider* cuda_ep,
                            Stream* ort_stream, AllocatorPtr gpu_allocator) : cublas_handle_(cublas_handle),
                                                                              cuda_ep_(cuda_ep),
                                                                              ort_stream_(ort_stream),
                                                                              gpu_allocator_(gpu_allocator) {}

  cudaStream_t GetCudaStream() {
    return ort_stream_ ? static_cast<cudaStream_t>(ort_stream_->GetHandle()) : nullptr;
  }

  cublasHandle_t cublas_handle_;
  const CUDAExecutionProvider* cuda_ep_;
  Stream* ort_stream_;
  AllocatorPtr gpu_allocator_;
};

namespace DeviceHelpers {

// These are CUDA EP specific device helper implementations
namespace CudaDeviceHelpers {

Status Transpose(const gsl::span<const size_t>& permutation, const Tensor& input,
                 Tensor& output, const TensorShape* input_shape_override, void* einsum_cuda_assets);

Status DataCopy(const Tensor& input, Tensor& output, void* einsum_cuda_assets);

template <typename T>
Status MatMul(const T* input_1_data, const T* input_2_data, T* output_data,
              size_t left_stride, size_t right_stride, size_t output_stride,
              size_t num_batches, size_t M, size_t K, size_t N, concurrency::ThreadPool* tp,
              void* einsum_cuda_assets);

template <typename T>
std::unique_ptr<Tensor> ReduceSum(const Tensor& input, gsl::span<const int64_t> reduce_axes,
                                  bool keep_dims, AllocatorPtr allocator,
                                  const TensorShape* input_shape_override,
                                  concurrency::ThreadPool* /*tp*/, void* einsum_cuda_assets);

std::unique_ptr<Tensor> Diagonal(const Tensor& input, int64_t dim_1, int64_t dim_2, AllocatorPtr allocator, void* einsum_cuda_assets);

}  // namespace CudaDeviceHelpers

}  // namespace DeviceHelpers

}  // namespace EinsumOp

}  // namespace onnxruntime
